import crypto from 'crypto';
import mongoose from 'mongoose';
import Case from '../models/Case.js';
import { generateMystery } from '../services/geminiService.js';
import {
  CreateCaseSchema,
  AccuseSchema,
  ClueIdParamSchema,
  DIFFICULTY_CONFIG,
} from '../validation/schemas.js';

// ─── POST /api/cases ─────────────────────────────────────────────────────────
export const createCase = async (req, res, next) => {
  try {
    const parseResult = CreateCaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues?.[0]?.message || 'Request validation failed.',
        code: 'VALIDATION_ERROR',
      });
    }

    const { premise, difficulty } = parseResult.data;

    // 1. Generate mystery via Gemini service with bounded retries
    const mysteryData = await generateMystery(premise, difficulty);

    // 2. Cryptographically secure random session token
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64-char hex
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const baseScore = DIFFICULTY_CONFIG[difficulty].baseScore;

    // 3. Construct Case document
    const newCase = new Case({
      title: mysteryData.title,
      story: mysteryData.story,
      premise,
      difficulty,
      sessionTokenHash: tokenHash,
      suspects: mysteryData.suspects,
      clues: mysteryData.clues.map((c) => ({
        id: c.id,
        text: c.text,
        discovered: false,
        discoveredAt: null,
      })),
      hints: mysteryData.hints.map((h) => ({
        id: h.id,
        text: h.text,
        used: false,
        usedAt: null,
      })),
      solution: mysteryData.solution,
      score: {
        base: baseScore,
        clueBonus: 0,
        hintPenalty: 0,
        provisional: baseScore,
        final: null,
      },
      status: 'active',
      createdAt: new Date(),
      lastActivityAt: new Date(),
    });

    await newCase.save();

    // 4. Return sanitized response with raw token (only once)
    res.status(201).json({
      success: true,
      data: {
        _id: newCase._id,
        title: newCase.title,
        story: newCase.story,
        difficulty: newCase.difficulty,
        status: newCase.status,
        score: newCase.score,
        createdAt: newCase.createdAt,
        lastActivityAt: newCase.lastActivityAt,
        suspects: newCase.suspects,
        clues: newCase.clues.map((c) => ({ id: c.id, discovered: false })),
        hints: {
          total: newCase.hints.length,
          used: 0,
          remaining: newCase.hints.length,
        },
        sessionToken: rawToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cases/:id ─────────────────────────────────────────────────────
export const getCase = async (req, res, next) => {
  try {
    const caseDoc = req.caseDoc;

    // Update lastActivityAt on read
    caseDoc.lastActivityAt = new Date();
    await caseDoc.save();

    const usedHints = caseDoc.hints.filter((h) => h.used);

    const sanitizedClues = caseDoc.clues.map((c) => {
      if (c.discovered) {
        return {
          id: c.id,
          text: c.text,
          discovered: true,
          discoveredAt: c.discoveredAt,
        };
      }
      return { id: c.id, discovered: false };
    });

    const responseData = {
      _id: caseDoc._id,
      title: caseDoc.title,
      story: caseDoc.story,
      premise: caseDoc.premise,
      difficulty: caseDoc.difficulty,
      status: caseDoc.status,
      score: caseDoc.score,
      createdAt: caseDoc.createdAt,
      lastActivityAt: caseDoc.lastActivityAt,
      suspects: caseDoc.suspects,
      clues: sanitizedClues,
      hints: {
        total: caseDoc.hints.length,
        used: usedHints.length,
        remaining: caseDoc.hints.length - usedHints.length,
        revealed: usedHints.map((h) => ({ id: h.id, text: h.text, used: true })),
      },
    };

    if (caseDoc.status === 'completed') {
      responseData.accusation = caseDoc.accusation;
    }

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cases/:id/clues/:clueId/discover ─────────────────────────────
export const discoverClue = async (req, res, next) => {
  try {
    const { id, clueId } = req.params;

    // Validate clueId format
    const clueParamResult = ClueIdParamSchema.safeParse(clueId);
    if (!clueParamResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid clue ID format.',
        code: 'INVALID_CLUE_ID',
      });
    }

    // Extract index N
    const match = clueId.match(/^clue_(\d+)$/);
    const clueIndex = parseInt(match[1], 10);

    const currentCase = req.caseDoc;
    const targetClue = currentCase.clues.find((c) => c.id === clueId);
    if (!targetClue) {
      return res.status(404).json({
        success: false,
        error: 'Clue not found.',
        code: 'CLUE_NOT_FOUND',
      });
    }

    // Build atomic sequential filter
    let filterCondition;
    if (clueIndex === 1) {
      filterCondition = {
        _id: id,
        status: 'active',
        clues: { $elemMatch: { id: 'clue_1', discovered: false } },
      };
    } else {
      const prevClueId = `clue_${clueIndex - 1}`;
      filterCondition = {
        _id: id,
        status: 'active',
        clues: {
          $all: [
            { $elemMatch: { id: prevClueId, discovered: true } },
            { $elemMatch: { id: clueId, discovered: false } },
          ],
        },
      };
    }

    // Execute atomic aggregation pipeline update
    const updatedCase = await Case.findOneAndUpdate(
      filterCondition,
      [
        {
          $set: {
            clues: {
              $map: {
                input: '$clues',
                as: 'c',
                in: {
                  $cond: [
                    { $eq: ['$$c.id', clueId] },
                    { $mergeObjects: ['$$c', { discovered: true, discoveredAt: new Date() }] },
                    '$$c',
                  ],
                },
              },
            },
            'score.clueBonus': { $add: ['$score.clueBonus', 5] },
            'score.provisional': { $add: ['$score.provisional', 5] },
            lastActivityAt: new Date(),
          },
        },
      ],
      { new: true, updatePipeline: true }
    );

    if (!updatedCase) {
      if (currentCase.status === 'completed') {
        return res.status(403).json({
          success: false,
          error: 'This case is already completed.',
          code: 'CASE_ALREADY_COMPLETED',
        });
      }

      if (targetClue.discovered) {
        return res.status(400).json({
          success: false,
          error: 'Clue already discovered.',
          code: 'CLUE_ALREADY_DISCOVERED',
        });
      }

      if (clueIndex > 1) {
        const prevClue = currentCase.clues.find((c) => c.id === `clue_${clueIndex - 1}`);
        if (!prevClue || !prevClue.discovered) {
          return res.status(400).json({
            success: false,
            error: 'Discover previous clues first.',
            code: 'SEQUENTIAL_ORDER_VIOLATION',
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: 'Clue already discovered.',
        code: 'CLUE_ALREADY_DISCOVERED',
      });
    }

    const discoveredObj = updatedCase.clues.find((c) => c.id === clueId);

    res.status(200).json({
      success: true,
      data: {
        discoveredClue: {
          id: discoveredObj.id,
          text: discoveredObj.text,
          discovered: true,
          discoveredAt: discoveredObj.discoveredAt,
        },
        score: updatedCase.score,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cases/:id/hints ──────────────────────────────────────────────
export const requestHint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentCase = req.caseDoc;

    if (currentCase.status === 'completed') {
      return res.status(403).json({
        success: false,
        error: 'This case is already completed.',
        code: 'CASE_ALREADY_COMPLETED',
      });
    }

    const updatedCase = await Case.findOneAndUpdate(
      { _id: id, status: 'active', 'hints.used': false },
      [
        {
          $set: {
            hints: {
              $map: {
                input: '$hints',
                as: 'h',
                in: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$$h.used', false] },
                        {
                          $eq: [
                            '$$h.id',
                            {
                              $arrayElemAt: [
                                {
                                  $map: {
                                    input: {
                                      $filter: {
                                        input: '$hints',
                                        as: 'fh',
                                        cond: { $eq: ['$$fh.used', false] },
                                      },
                                    },
                                    as: 'uh',
                                    in: '$$uh.id',
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    { $mergeObjects: ['$$h', { used: true, usedAt: new Date() }] },
                    '$$h',
                  ],
                },
              },
            },
            lastActivityAt: new Date(),
            'score.hintPenalty': { $subtract: ['$score.hintPenalty', 10] },
            'score.provisional': {
              $max: [0, { $subtract: ['$score.provisional', 10] }],
            },
          },
        },
      ],
      { new: true, updatePipeline: true }
    );

    if (!updatedCase) {
      return res.status(400).json({
        success: false,
        error: 'No hints remaining.',
        code: 'NO_HINTS_REMAINING',
      });
    }

    const usedHints = updatedCase.hints.filter((h) => h.used);
    const revealedHint = usedHints[usedHints.length - 1];
    const hintsRemaining = updatedCase.hints.filter((h) => !h.used).length;

    res.status(200).json({
      success: true,
      data: {
        hint: {
          id: revealedHint.id,
          text: revealedHint.text,
          used: true,
        },
        hintsRemaining,
        score: updatedCase.score,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cases/:id/accuse ─────────────────────────────────────────────
export const accuse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const parseResult = AccuseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues?.[0]?.message || 'Invalid suspect ID.',
        code: 'VALIDATION_ERROR',
      });
    }

    const { suspectId } = parseResult.data;

    // 1. Retrieve active case with private solution
    const activeCase = await Case.findOne({ _id: id, status: 'active' }).select('+solution');
    if (!activeCase) {
      return res.status(403).json({
        success: false,
        error: 'This case is already completed.',
        code: 'CASE_ALREADY_COMPLETED',
      });
    }

    // 2. Validate suspect exists in suspects
    const suspectExists = activeCase.suspects.some((s) => s.id === suspectId);
    if (!suspectExists) {
      return res.status(400).json({
        success: false,
        error: 'Invalid suspect ID.',
        code: 'INVALID_SUSPECT_ID',
      });
    }

    // 3. Determine correctness
    const isCorrect = suspectId === activeCase.solution.culpritId;

    // 4. Atomic state transition and score computation
    const finalizedCase = await Case.findOneAndUpdate(
      { _id: id, status: 'active' },
      [
        {
          $set: {
            status: 'completed',
            'accusation.suspectId': suspectId,
            'accusation.isCorrect': isCorrect,
            'accusation.submittedAt': new Date(),
            'score.final': { $cond: [isCorrect, { $max: [0, '$score.provisional'] }, 0] },
            'score.provisional': { $cond: [isCorrect, { $max: [0, '$score.provisional'] }, 0] },
            lastActivityAt: new Date(),
          },
        },
      ],
      { new: true, updatePipeline: true }
    ).select('+solution');

    if (!finalizedCase) {
      return res.status(403).json({
        success: false,
        error: 'This case is already completed.',
        code: 'CASE_ALREADY_COMPLETED',
      });
    }

    const culprit = finalizedCase.suspects.find(
      (s) => s.id === finalizedCase.solution.culpritId
    );

    res.status(200).json({
      success: true,
      data: {
        verdict: isCorrect ? 'correct' : 'incorrect',
        isCorrect,
        accusation: finalizedCase.accusation,
        culprit: {
          id: culprit.id,
          name: culprit.name,
          description: culprit.description,
        },
        solution: {
          culpritId: finalizedCase.solution.culpritId,
          explanation: finalizedCase.solution.explanation,
        },
        score: finalizedCase.score,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cases/:id/result ──────────────────────────────────────────────
export const getResult = async (req, res, next) => {
  try {
    const { id } = req.params;

    const caseDoc = await Case.findById(id).select('+solution');
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: 'Case not found.',
        code: 'CASE_NOT_FOUND',
      });
    }

    if (caseDoc.status !== 'completed') {
      return res.status(403).json({
        success: false,
        error: 'Results not available until accusation is submitted.',
        code: 'RESULT_NOT_AVAILABLE',
      });
    }

    caseDoc.lastActivityAt = new Date();
    await caseDoc.save();

    const culprit = caseDoc.suspects.find(
      (s) => s.id === caseDoc.solution.culpritId
    );

    res.status(200).json({
      success: true,
      data: {
        title: caseDoc.title,
        story: caseDoc.story,
        difficulty: caseDoc.difficulty,
        accusation: caseDoc.accusation,
        culprit: {
          id: culprit.id,
          name: culprit.name,
          description: culprit.description,
          alibi: culprit.alibi,
        },
        solution: {
          culpritId: caseDoc.solution.culpritId,
          explanation: caseDoc.solution.explanation,
        },
        score: caseDoc.score,
        // All clues with text revealed on results page
        clues: caseDoc.clues.map((c) => ({
          id: c.id,
          text: c.text,
          discovered: c.discovered,
          discoveredAt: c.discoveredAt,
        })),
        hints: caseDoc.hints,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createCase,
  getCase,
  discoverClue,
  requestHint,
  accuse,
  getResult,
};
