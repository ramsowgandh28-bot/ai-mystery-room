import { Router } from 'express';
import {
  createCase,
  getCase,
  discoverClue,
  requestHint,
  accuse,
  getResult,
} from '../controllers/caseController.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  createCaseLimiter,
  accuseLimiter,
  hintLimiter,
  clueLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/cases — Generate a new mystery
router.post('/', createCaseLimiter, createCase);

// GET /api/cases/:id — Load investigation room
router.get('/:id', authenticate, getCase);

// POST /api/cases/:id/clues/:clueId/discover — Discover a clue sequentially
router.post('/:id/clues/:clueId/discover', clueLimiter, authenticate, discoverClue);

// POST /api/cases/:id/hints — Request next sequential hint
router.post('/:id/hints', hintLimiter, authenticate, requestHint);

// POST /api/cases/:id/accuse — Submit an accusation
router.post('/:id/accuse', accuseLimiter, authenticate, accuse);

// GET /api/cases/:id/result — Retrieve completed results
router.get('/:id/result', authenticate, getResult);

export default router;
