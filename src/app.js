/**
 * app.js — Vercel-compatible Express entry point.
 *
 * Key rules for Vercel serverless:
 *  1. Do NOT call app.listen() here — Vercel manages the HTTP lifecycle.
 *  2. Do NOT import socket.io here — it is incompatible with serverless.
 *  3. Export the app as `export default app` so @vercel/node wraps it.
 *  4. DB connection is done per-request via middleware (readyState caching).
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { errorHandler, AppError } from './middlewares/errorHandler.js';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import forumRoutes from './routes/forum.routes.js';
import placementRoutes from './routes/placement.routes.js';
import researchRoutes from './routes/research.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chat.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import eventRoutes from './routes/event.routes.js';
import mentorshipRoutes from './routes/mentorship.routes.js';
import studyGroupRoutes from './routes/studygroup.routes.js';
import statsRoutes from './routes/stats.routes.js';
import debugRoutes from './routes/debug.routes.js';

const app = express();

// ── Security Headers — disable COOP so Firebase auth popups work ──────────────
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}));
app.use((req, res, next) => {
  res.removeHeader('Cross-Origin-Opener-Policy');
  next();
});

// ── Request Logging (dev only) ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 2000,
  message: { success: false, message: 'Too many requests. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ── Serverless DB Middleware ──────────────────────────────────────────────────
// Each Vercel invocation awaits the DB before proceeding (readyState caching
// means only the first cold-start pays the connection cost).
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/forum', forumRoutes);
app.use('/api/v1/placements', placementRoutes);
app.use('/api/v1/research', researchRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/mentorship', mentorshipRoutes);
app.use('/api/v1/study-groups', studyGroupRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/debug', debugRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date(),
    env: process.env.NODE_ENV,
  });
});

// ── Root Route ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'MnCHub backend is running. Use /api/v1/* for API access.',
    health: '/api/v1/health',
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// Export for Vercel (@vercel/node wraps this — do NOT call app.listen here)
export default app;
