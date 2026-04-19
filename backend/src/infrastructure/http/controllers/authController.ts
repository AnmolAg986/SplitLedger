import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/Request';
import { UserRepository } from '../../persistence/UserRepository';
import { hashPassword, verifyPassword } from '../../../shared/utils/hash';
import { generateTokens, verifyRefreshToken } from '../../../shared/utils/jwt';
import { safeRedisGet, safeRedisSetEx } from '../../../config/redis';
import { sendVerificationEmail } from '../../../shared/utils/emailService';
import { sendVerificationSMS } from '../../../shared/utils/smsService';

const isPhone = (id: string) => /^\+?\d+$/.test(id);

const identifierSchema = z.string().refine(val => {
  return /^\+?\d{10,15}$/.test(val) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}, "Must be a valid email or E.164 phone number (e.g. +919876543210 or 9876543210)");

const registerSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(8, "Password is too weak. Please use at least 8 characters.").regex(/^[a-zA-Z0-9]+$/, "Password can only contain letters and numbers (no special characters or spaces)"),
  displayName: z.string().min(2),
});

const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string(),
});

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

      const user = await UserRepository.create(emailVal, phoneVal, displayName, passwordHash);

      // Generate and send OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await UserRepository.storeOTP(user.id, otp);
      
      if (phoneVal) {
        await sendVerificationSMS(phoneVal, otp);
      } else if (emailVal) {
        await sendVerificationEmail(emailVal, otp);
      }

      return res.status(201).json({
        message: "Account created successfully. Please verify your OTP.",
        identifier: identifier
      });
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

      const { accessToken, refreshToken } = generateTokens(user.id);
      await UserRepository.incrementLoginCount(user.id);

      return res.status(200).json({
        user: { 
          id: user.id, 
          email: user.email, 
          phoneNumber: user.phoneNumber, 
          displayName: user.displayName,
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

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded || !decoded.userId) return res.status(401).json({ error: 'Invalid refresh token' });

      const isBlacklisted = await safeRedisGet(`bl_${refreshToken}`);
      if (isBlacklisted) return res.status(401).json({ error: 'Token revoked' });

      const tokens = generateTokens(decoded.userId);
      return res.status(200).json(tokens);
    } catch (e: unknown) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await safeRedisSetEx(`bl_${refreshToken}`, 7 * 24 * 60 * 60, '1');
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

      const { accessToken, refreshToken } = generateTokens(user.id);
      await UserRepository.incrementLoginCount(user.id);
      
      const updatedUser = await UserRepository.findById(user.id);

      return res.status(200).json({
        user: { 
          id: updatedUser?.id, 
          email: updatedUser?.email, 
          phoneNumber: updatedUser?.phoneNumber, 
          displayName: updatedUser?.displayName,
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
}
