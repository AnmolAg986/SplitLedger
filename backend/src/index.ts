import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

import authRoutes from './infrastructure/http/routes/authRoutes';
import dashboardRoutes from './infrastructure/http/routes/dashboardRoutes';

// ── Phase 3+ routes (uncomment when reaching those phases) ──
// import friendRoutes from './infrastructure/http/routes/friendRoutes';
// import groupRoutes from './infrastructure/http/routes/groupRoutes';
// import expenseRoutes from './infrastructure/http/routes/expenseRoutes';
// import settlementRoutes from './infrastructure/http/routes/settlementRoutes';
// import chatRoutes from './infrastructure/http/routes/chatRoutes';
// import { initSocketServer } from './infrastructure/websocket/socketServer';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

// ── Phase 3+ routes (uncomment when reaching those phases) ──
// app.use('/friends', friendRoutes);
// app.use('/groups', groupRoutes);
// app.use('/expenses', expenseRoutes);
// app.use('/settlements', settlementRoutes);
// app.use('/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Create HTTP server
const httpServer = createServer(app);

// ── Phase 4+: Socket.IO (uncomment when reaching that phase) ──
// const io = initSocketServer(httpServer);
// app.set('io', io);

const startServer = async () => {
  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

startServer();
