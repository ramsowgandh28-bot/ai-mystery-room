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
app.get('/health', async (req, res) => {
  let geminiStatus = 'not_tested';
  let geminiDetail = null;
  if (req.query.checkGemini === 'true') {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const testRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Return {"status":"ready"} in JSON',
        config: { responseMimeType: 'application/json' },
      });
      geminiStatus = 'connected';
      geminiDetail = testRes?.text ? 'responsive' : 'empty';
    } catch (e) {
      geminiStatus = 'error';
      geminiDetail = e.message || 'unknown error';
    }
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...(req.query.checkGemini === 'true' && { gemini: geminiStatus, detail: geminiDetail }),
  });
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
