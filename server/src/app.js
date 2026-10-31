import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { configureSecurityHeaders } from './middleware/securityHeaders.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import caseRoutes from './routes/cases.js';

dotenv.config();

const app = express();

// 1. Trust proxy configuration matching host topology
const trustProxyHops = process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 1;
app.set('trust proxy', trustProxyHops);

// 2. Helmet defensive security headers with CSP
configureSecurityHeaders(app);

// 3. CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-Session-Token'],
  })
);

// 4. Body parser with strict size limit
app.use(express.json({ limit: '10kb' }));

// 5. Global rate limiter
app.use('/api', generalLimiter);

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 6. Routes mounted at /api/cases
app.use('/api/cases', caseRoutes);

// 7. 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found.',
    code: 'NOT_FOUND',
  });
});

// 8. Global error handler (strictly last)
app.use(errorHandler);

export default app;
