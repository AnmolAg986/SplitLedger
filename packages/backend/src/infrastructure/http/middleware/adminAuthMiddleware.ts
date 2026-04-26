import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../../shared/utils/jwt';
import { env } from '../../../config/env';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }

  try {
    const payload = verifyAccessToken(token) as any;
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    req.user = { id: payload.userId };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
};
