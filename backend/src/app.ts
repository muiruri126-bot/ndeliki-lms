import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { requestLogger, errorHandler } from './middleware';
import authRouter from './modules/auth/auth.routes';
import userRouter from './modules/users/user.routes';
import borrowerRouter from './modules/borrowers/borrower.routes';
import loanRouter from './modules/loans/loan.routes';
import paymentRouter from './modules/payments/payment.routes';
import reportRouter from './modules/reports/report.routes';
import auditRouter from './modules/audit/audit.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import productRouter from './modules/products/product.routes';
import documentRouter from './modules/documents/document.routes';

const app = express();

// Trust Railway / reverse proxy (needed for secure cookies & rate limiting)
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Let the SPA handle its own CSP
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

// ── Rate limiting ─────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use(limiter);

// ── Body parsing ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Request logging ───────────────────────────────────
app.use(requestLogger);

// ── Health check ──────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'NDELIKI LMS API is running',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/borrowers', borrowerRouter);
app.use('/api/loans', loanRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/reports', reportRouter);
app.use('/api/audit', auditRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/products', productRouter);
app.use('/api/documents', documentRouter);

// ── Serve frontend static files in production ─────────
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ── SPA catch-all (must come after API routes) ────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Global error handler ──────────────────────────────
app.use(errorHandler);

export default app;
