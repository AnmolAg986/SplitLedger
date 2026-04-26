import { Request, Response } from 'express';
import { z } from 'zod';
import { registerSchema, loginSchema, identifierSchema } from '../../../shared/validation/authSchema';
import { AuthenticatedRequest } from '../types/Request';
import { UserRepository } from '../../persistence/UserRepository';
import { hashPassword, verifyPassword } from '../../../shared/utils/hash';
import { generateAccessToken } from '../../../shared/utils/jwt';
import { safeRedisGet, safeRedisSetEx } from '../../../config/redis';
import { sendVerificationEmail } from '../../../shared/utils/emailService';
import { sendVerificationSMS } from '../../../shared/utils/smsService';
import crypto from 'crypto';
import { RefreshTokenRepository } from '../../persistence/RefreshTokenRepository';
import { SessionRepository } from '../../persistence/SessionRepository';
import { AuditLogRepository } from '../../persistence/AuditLogRepository';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

async function createSession(
  userId: string,
  familyId?: string,
  ipAddress?: string | null,
  userAgent?: string | null
) {
  const accessToken = generateAccessToken(userId);
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const actualFamilyId = familyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const tokenRecord = await RefreshTokenRepository.storeToken(userId, tokenHash, actualFamilyId, expiresAt);

  // Track session if we have IP / UA context
  if (ipAddress !== undefined) {
    await SessionRepository.createSession(userId, tokenRecord.id, ipAddress ?? null, userAgent ?? null);
  }

  return { accessToken, refreshToken: rawRefreshToken, refreshTokenId: tokenRecord.id };
}

const isPhone = (id: string) => /^\+?\d+$/.test(id);

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { identifier, password, displayName } = registerSchema.parse(req.body);

      const existingUser = await UserRepository.findByIdentifier(identifier);
      if (existingUser) {
         return res.status(409).json({ error: 'Account with this email or phone already exists' });
      }

      const passwordHash = await hashPassword(password);
      
      const phoneVal = isPhone(identifier) ? identifier : null;
      const emailVal = isPhone(identifier) ? null : identifier;

      let usernameVal = registerSchema.shape.username ? req.body.username : null;

      try {
        const user = await UserRepository.create(emailVal, phoneVal, displayName, passwordHash, usernameVal);
        
        // Generate and send OTP
        const otp = process.env.NODE_ENV === 'test' 
          ? '123456' 
          : Math.floor(100000 + Math.random() * 900000).toString();
        await UserRepository.storeOTP(user.id, otp);
        
        if (phoneVal) {
          await sendVerificationSMS(phoneVal, otp);
        } else if (emailVal) {
          await sendVerificationEmail(emailVal, otp);
        }

        // Record privacy policy agreement
        if (req.body.agreedToPrivacyPolicy) {
          await UserRepository.recordPrivacyPolicyAgreement(user.id);
        }

        return res.status(201).json({
          message: "Account created successfully. Please verify your OTP.",
          identifier: identifier
        });
      } catch (err: any) {
        if (err.code === '23505' && err.constraint === 'users_username_idx') {
           return res.status(409).json({ error: 'Username is already taken' });
        }
        throw err;
      }
    } catch (e: unknown) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: e.issues });
      }
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { identifier, password } = loginSchema.parse(req.body);

      const user = await UserRepository.findByIdentifier(identifier);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      if (!user.isVerified) {
        const uId = user.email || user.phoneNumber;
        return res.status(403).json({ 
          error: 'Please verify your account to log in.',
          error_code: 'UNVERIFIED_EMAIL',
          identifier: uId
        });
      }

      // If 2FA is enabled, issue a short-lived tempToken instead
      if (user.twoFaEnabled) {
        const tempToken = jwt.sign({ userId: user.id, purpose: '2fa' }, env.JWT_SECRET, { expiresIn: '5m' });
        return res.status(200).json({ requires2FA: true, tempToken });
      }

      const { accessToken, refreshToken } = await createSession(
        user.id, undefined,
        req.ip || null,
        req.headers['user-agent'] || null
      );
      await UserRepository.incrementLoginCount(user.id);
      await AuditLogRepository.log(user.id, 'login', 'auth', null, req.ip || null, req.headers['user-agent'] || null);

      return res.status(200).json({
        user: { 
          id: user.id, 
          email: user.email, 
          phoneNumber: user.phoneNumber, 
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          twoFaEnabled: user.twoFaEnabled,
          onboardingCompleted: user.onboardingCompleted,
          loginCount: user.loginCount + 1
        },
        accessToken,
        refreshToken,
      });
    } catch (e: unknown) {
      if (e instanceof z.ZodError) {
        return res.status(401).json({ error: 'Invalid credentials format.' });
      }
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

      // If they passed a JWT token (from old session), it won't be found in DB hash
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenRecord = await RefreshTokenRepository.findByHash(tokenHash);

      if (!tokenRecord) {
         return res.status(401).json({ error: 'Invalid refresh token' });
      }

      if (tokenRecord.revokedAt) {
         // THEFT DETECTED: A revoked token is being reused!
         await RefreshTokenRepository.revokeFamily(tokenRecord.familyId);
         return res.status(401).json({ error: 'Token revoked (Theft detected). Family invalidated.' });
      }

      if (tokenRecord.expiresAt < new Date()) {
         return res.status(401).json({ error: 'Refresh token expired' });
      }

      // Valid token -> Revoke it (rotate)
      await RefreshTokenRepository.revokeToken(tokenRecord.id);

      // Issue new token in the same family, inherit session context
      const tokens = await createSession(
        tokenRecord.userId,
        tokenRecord.familyId,
        req.ip || null,
        req.headers['user-agent'] || null
      );

      // Update last_active on any session tied to old token
      if (tokens.refreshTokenId) {
        // new session already created; delete the old session row
        await SessionRepository.deleteByRefreshTokenId(tokenRecord.id);
      }

      return res.status(200).json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (e: unknown) {
      console.error(e);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const tokenRecord = await RefreshTokenRepository.findByHash(tokenHash);
        if (tokenRecord) {
           await RefreshTokenRepository.revokeToken(tokenRecord.id);
           await SessionRepository.deleteByRefreshTokenId(tokenRecord.id);
        }
      }
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyOtp(req: Request, res: Response) {
    try {
      const { identifier, code } = req.body;
      if (!identifier || !code) return res.status(400).json({ error: 'Identifier and code required' });

      const user = await UserRepository.findByIdentifier(identifier);
      if (!user) return res.status(400).json({ error: 'Invalid request' });
      
      if (user.isVerified) return res.status(200).json({ message: 'Already verified' });

      const isValid = await UserRepository.verifyOTP(user.id, code);
      if (!isValid) return res.status(400).json({ error: 'Invalid or expired code' });

      const { accessToken, refreshToken } = await createSession(
        user.id, undefined,
        req.ip || null,
        req.headers['user-agent'] || null
      );
      await UserRepository.incrementLoginCount(user.id);
      
      const updatedUser = await UserRepository.findById(user.id);

      return res.status(200).json({
        user: { 
          id: updatedUser?.id, 
          email: updatedUser?.email, 
          phoneNumber: updatedUser?.phoneNumber, 
          displayName: updatedUser?.displayName,
          username: updatedUser?.username,
          onboardingCompleted: updatedUser?.onboardingCompleted,
          loginCount: updatedUser?.loginCount
        },
        accessToken,
        refreshToken,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async resendOtp(req: AuthenticatedRequest, res: Response) {
    try {
      const { identifier } = req.body;
      if (!identifier) return res.status(400).json({ error: 'Identifier required' });

      const user = await UserRepository.findByIdentifier(identifier);
      if (!user) return res.status(400).json({ error: 'Invalid request' });
      
      if (user.isVerified) return res.status(400).json({ error: 'User is already verified' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await UserRepository.storeOTP(user.id, otp);

      if (user.phoneNumber) {
        await sendVerificationSMS(user.phoneNumber, otp);
      } else if (user.email) {
        await sendVerificationEmail(user.email, otp);
      }

      return res.status(200).json({ message: 'OTP resent successfully' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async forgotPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { identifier } = req.body;
      if (!identifier) return res.status(400).json({ error: 'Identifier required' });

      const user = await UserRepository.findByIdentifier(identifier);
      if (!user) {
        return res.status(200).json({ message: 'If you have an account, an OTP has been sent.' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await UserRepository.storeOTP(user.id, otp);
      
      if (user.phoneNumber) {
        await sendVerificationSMS(user.phoneNumber, otp);
      } else if (user.email) {
        await sendVerificationEmail(user.email, otp);
      }

      return res.status(200).json({ message: 'If you have an account, an OTP has been sent.' });
    } catch (e: unknown) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyResetOtp(req: AuthenticatedRequest, res: Response) {
    try {
      const { identifier, code } = req.body;
      if (!identifier || !code) return res.status(400).json({ error: 'Identifier and code required' });

      const user = await UserRepository.findByIdentifier(identifier);
      if (!user) return res.status(400).json({ error: 'Invalid request' });

      const isValid = await UserRepository.checkOTP(user.id, code);
      if (!isValid) return res.status(400).json({ error: 'Invalid or expired code' });

      return res.status(200).json({ message: 'OTP verified successfully.' });
    } catch (e: unknown) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { identifier, code, newPassword } = req.body;
      if (!identifier || !code || !newPassword) return res.status(400).json({ error: 'Missing fields' });
      
      if (!/^[a-zA-Z0-9]+$/.test(newPassword) || newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 alphanumeric characters.' });
      }

      const user = await UserRepository.findByIdentifier(identifier);
      if (!user) return res.status(400).json({ error: 'Invalid request' });

      const isValid = await UserRepository.verifyResetOTP(user.id, code);
      if (!isValid) return res.status(400).json({ error: 'Invalid or expired code' });

      const passwordHash = await hashPassword(newPassword);
      await UserRepository.updatePassword(user.id, passwordHash);

      return res.status(200).json({ message: 'Password has been safely reset.' });
    } catch (e: unknown) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { displayName, avatarUrl, username } = req.body;
      if (!displayName || displayName.trim().length < 2) {
        return res.status(400).json({ error: 'Display name must be at least 2 characters long' });
      }
      
      if (username && !/^[a-zA-Z0-9_]{3,}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be at least 3 characters and contain only letters, numbers, and underscores' });
      }

      try {
        const updatedUser = await UserRepository.updateProfile(userId, displayName.trim(), avatarUrl || null, username || null);
        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
          message: 'Profile updated successfully',
          user: { 
            id: updatedUser.id, 
            email: updatedUser.email, 
            phoneNumber: updatedUser.phoneNumber, 
            displayName: updatedUser.displayName,
            username: updatedUser.username,
            avatarUrl: updatedUser.avatarUrl,
            onboardingCompleted: updatedUser.onboardingCompleted,
            loginCount: updatedUser.loginCount
          }
        });
      } catch (err: any) {
        if (err.code === '23505') {
           return res.status(409).json({ error: 'Username is already taken' });
        }
        throw err;
      }
    } catch (e) {
      console.error('[AuthController] updateProfile error:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPublicProfile(req: Request, res: Response) {
    try {
      const username = req.params.username as string;
      const user = await UserRepository.findByIdentifier(username); // since findByIdentifier checks username
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        id: user.id,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        username: user.username
      });
    } catch (e) {
      console.error('[AuthController] getPublicProfile error:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async completeOnboarding(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      await UserRepository.completeOnboarding(userId);
      
      const user = await UserRepository.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      return res.status(200).json({
        message: 'Onboarding completed',
        user: { 
          id: user.id, 
          email: user.email, 
          phoneNumber: user.phoneNumber, 
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          onboardingCompleted: user.onboardingCompleted,
          loginCount: user.loginCount
        }
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- 2FA Endpoints ---

  static async setup2FA(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const secret = new OTPAuth.Secret({ size: 20 });
      const user = await UserRepository.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const totp = new OTPAuth.TOTP({
        issuer: 'SplitLedger',
        label: user.email || user.phoneNumber || userId,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      });

      const uri = totp.toString();
      const qrDataUrl = await QRCode.toDataURL(uri);

      // Store secret temporarily in Redis (5 min) — not yet active
      await safeRedisSetEx(`2fa_setup_${userId}`, 300, secret.base32);

      return res.status(200).json({ qrDataUrl, secret: secret.base32 });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verify2FA(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'TOTP code required' });

      const secretBase32 = await safeRedisGet(`2fa_setup_${userId}`);
      if (!secretBase32) return res.status(400).json({ error: 'Setup session expired. Please restart.' });

      const totp = new OTPAuth.TOTP({
        issuer: 'SplitLedger',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secretBase32),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) return res.status(400).json({ error: 'Invalid TOTP code' });

      // Activate 2FA
      await UserRepository.enable2FA(userId, secretBase32);

      // Generate 10 recovery codes
      const recoveryCodes: string[] = [];
      const hashes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(10).toString('hex'); // 20-char code
        recoveryCodes.push(`${code.slice(0, 5)}-${code.slice(5, 10)}-${code.slice(10, 15)}-${code.slice(15, 20)}`);
        hashes.push(crypto.createHash('sha256').update(code).digest('hex'));
      }
      await UserRepository.storeRecoveryCodes(userId, hashes);

      return res.status(200).json({ message: '2FA enabled successfully', recoveryCodes });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async validate2FA(req: Request, res: Response) {
    try {
      const { tempToken, code } = req.body;
      if (!tempToken || !code) return res.status(400).json({ error: 'tempToken and code required' });

      let payload: any;
      try {
        payload = jwt.verify(tempToken, env.JWT_SECRET) as any;
      } catch {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      if (payload.purpose !== '2fa') return res.status(401).json({ error: 'Invalid token purpose' });

      const user = await UserRepository.findById(payload.userId);
      if (!user || !user.totpSecret) return res.status(401).json({ error: 'User not found or 2FA not configured' });

      const totp = new OTPAuth.TOTP({
        issuer: 'SplitLedger',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      let valid = delta !== null;

      // Check recovery codes if TOTP fails
      if (!valid) {
        const cleanCode = code.replace(/-/g, '');
        const codeHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
        valid = await UserRepository.verifyRecoveryCode(user.id, codeHash);
      }

      if (!valid) return res.status(401).json({ error: 'Invalid code' });

      const tokens = await createSession(user.id);
      await UserRepository.incrementLoginCount(user.id);

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          twoFaEnabled: user.twoFaEnabled,
          onboardingCompleted: user.onboardingCompleted,
          loginCount: user.loginCount + 1
        },
        ...tokens
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async disable2FA(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'TOTP code required to disable 2FA' });

      const user = await UserRepository.findById(userId);
      if (!user || !user.totpSecret) return res.status(400).json({ error: '2FA is not enabled' });

      const totp = new OTPAuth.TOTP({
        issuer: 'SplitLedger',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) return res.status(400).json({ error: 'Invalid TOTP code' });

      await UserRepository.disable2FA(userId);
      return res.status(200).json({ message: '2FA disabled successfully' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- Session Management ---

  static async getSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const sessions = await SessionRepository.findByUserId(userId);

      const parsed = sessions.map(s => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        lastActive: s.lastActive,
        createdAt: s.createdAt,
        device: parseDevice(s.userAgent),
      }));

      return res.status(200).json({ sessions: parsed });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const session = await SessionRepository.findById(id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      if (session.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

      await SessionRepository.deleteSession(id);
      return res.status(200).json({ message: 'Session revoked' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async logoutOtherDevices(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: 'Current refresh token required' });

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenRecord = await RefreshTokenRepository.findByHash(tokenHash);
      if (!tokenRecord || tokenRecord.userId !== userId) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      await SessionRepository.deleteAllOtherSessions(userId, tokenRecord.id);
      return res.status(200).json({ message: 'All other devices logged out' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- GDPR Endpoints ---

  static async exportData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = await UserRepository.exportData(userId);

      res.setHeader('Content-Disposition', `attachment; filename="splitledger-export-${Date.now()}.json"`);
      res.setHeader('Content-Type', 'application/json');
      await AuditLogRepository.log(userId, 'export_data', 'user', userId, req.ip || null, req.headers['user-agent'] || null);
      return res.status(200).send(JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { password } = req.body;
      if (!password) return res.status(400).json({ error: 'Password required to delete account' });

      const user = await UserRepository.findById(userId);
      if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid request' });

      const { verifyPassword } = await import('../../../shared/utils/hash');
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) return res.status(401).json({ error: 'Incorrect password' });

      await UserRepository.softDeleteAccount(userId);

      // Revoke all sessions
      await RefreshTokenRepository.revokeAllForUser(userId);

      await AuditLogRepository.log(userId, 'delete_account', 'user', userId, req.ip || null, req.headers['user-agent'] || null);

      return res.status(200).json({
        message: 'Account scheduled for deletion. Your data will be permanently removed in 30 days.',
        scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async cancelDeletion(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      await UserRepository.cancelDeletion(userId);
      return res.status(200).json({ message: 'Account deletion cancelled successfully.' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}


function parseDevice(ua: string | null): string {
  if (!ua) return 'Unknown Device';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad/i.test(ua)) return 'iPhone / iPad';
  if (/macintosh|mac os/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'Windows PC';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown Device';
}
