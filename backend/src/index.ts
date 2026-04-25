import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { errorHandler } from './infrastructure/http/middleware/errorHandler';
import { env } from './config/env';

import authRoutes from './infrastructure/http/routes/authRoutes';
import dashboardRoutes from './infrastructure/http/routes/dashboardRoutes';

// ── Phase 3: Friends & Groups ──
import friendRoutes from './infrastructure/http/routes/friendRoutes';
import groupRoutes from './infrastructure/http/routes/groupRoutes';

import expenseRoutes from './infrastructure/http/routes/expenseRoutes';
import expenseTemplateRoutes from './infrastructure/http/routes/expenseTemplateRoutes';
import settlementRoutes from './infrastructure/http/routes/settlementRoutes';
import chatRoutes from './infrastructure/http/routes/chatRoutes';
import uploadRoutes from './infrastructure/http/routes/uploadRoutes';
import unreadRoutes from './infrastructure/http/routes/unreadRoutes';
import notificationRoutes from './infrastructure/http/routes/notificationRoutes';
import analyticsRoutes from './infrastructure/http/routes/analyticsRoutes';
import budgetRoutes from './infrastructure/http/routes/budgetRoutes';
import blockRoutes from './infrastructure/http/routes/blockRoutes';
import userRoutes from './infrastructure/http/routes/userRoutes';
import path from 'path';
import { initSocketServer } from './infrastructure/websocket/socketServer';
import { startReminderJob } from './infrastructure/cron/reminderJob';
import { startRecurringExpenseJob } from './infrastructure/cron/RecurringExpenseJob';
import { startBudgetAlertJob } from './infrastructure/cron/budgetAlertJob';
import { RecurringSettlementJob } from './infrastructure/cron/recurringSettlementJob';
import { globalLimiter } from './infrastructure/http/middleware/rateLimiter';
import { requestIdMiddleware } from './infrastructure/http/middleware/requestId';
import pinoHttp from 'pino-http';
import { logger } from './shared/utils/logger';

const app = express();
const port = env.PORT;

// Apply global rate limiter
app.use(globalLimiter);

// Gzip/deflate all responses (14.5)
app.use(compression());

// Add Request ID
app.use(requestIdMiddleware);

// Add HTTP logger
app.use(pinoHttp({ 
  logger,
  genReqId: (req) => req.id 
}));

// Apply Helmet with Content Security Policy (CSP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", env.CORS_ORIGIN], // Allows images from self, data URIs, and frontend
      connectSrc: ["'self'", env.CORS_ORIGIN, "ws:", "wss:"], // Allows API calls and WebSocket connections
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required if frontend loads /uploads images via cross-origin
}));

app.use(cors({
  origin: [env.CORS_ORIGIN, 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true
}));

// CSRF Protection Note:
// SplitLedger uses Bearer tokens (JWT) sent via the `Authorization` header instead of cookies.
// Because the browser does not automatically attach Bearer tokens to cross-site requests,
// traditional CSRF (Cross-Site Request Forgery) attacks are inherently mitigated.
// No double-submit cookie or stateful CSRF token middleware (like csurf) is necessary.
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

// ── Phase 3: Friends & Groups ──
app.use('/friends', friendRoutes);
app.use('/groups', groupRoutes);

// ── Phase 4+ routes ──
app.use('/expenses', expenseRoutes);
app.use('/expense-templates', expenseTemplateRoutes);
app.use('/settlements', settlementRoutes);
app.use('/chat', chatRoutes);
app.use('/upload', uploadRoutes);
app.use('/unread', unreadRoutes);
app.use('/notifications', notificationRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/budgets', budgetRoutes);
app.use('/blocks', blockRoutes);
app.use('/users', userRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  etag: true,
  maxAge: '365d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

import { pool } from './config/db';

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ db: 'ok', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ db: 'error', uptime: process.uptime(), error: err });
  }
});

// Error handling middleware should be the last app.use()
app.use(errorHandler);

// Create HTTP server
const httpServer = createServer(app);

// ── Phase 4+: Socket.IO ──
const io = initSocketServer(httpServer);
app.set('io', io);

const startServer = async () => {
  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startReminderJob();
    startRecurringExpenseJob();
    startBudgetAlertJob();
    RecurringSettlementJob.start();
  });
};

startServer();
