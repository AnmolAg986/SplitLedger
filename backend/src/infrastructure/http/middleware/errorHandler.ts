import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors/AppError';

import { logger } from '../../../shared/utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn({ err, reqId: req.id }, 'AppError thrown');
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  logger.error({ err, reqId: req.id }, 'Unhandled Error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
