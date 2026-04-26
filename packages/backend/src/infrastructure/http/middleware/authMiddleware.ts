import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../../shared/utils/jwt';
import { safeRedisGet } from '../../../config/redis';

// Extends Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check token blacklist (gracefully skips if Redis is unavailable)
    const isBlacklisted = await safeRedisGet(`bl_${token}`);
    if (isBlacklisted) return res.status(401).json({ error: 'Token revoked' });

    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
