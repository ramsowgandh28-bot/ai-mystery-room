import { GoogleGenAI } from '@google/genai';
import { GeminiMysterySchema, DIFFICULTY_CONFIG } from '../validation/schemas.js';

export const buildPrompt = (premise, difficulty) => {
  const config = DIFFICULTY_CONFIG[difficulty];
  return `You are a mystery writer AI. Generate a complete murder mystery case in strict JSON format.

Premise: ${premise}
Difficulty: ${difficulty}

Requirements:
- title: string (catchy, thematic)
- story: string (at least 50 characters, rich setting, establishes victim and circumstances)
- suspects: exactly ${config.suspects} suspects. Each has id ("suspect_1", "suspect_2", ...), name, description (at least 10 chars), alibi (at least 10 chars). All names must be unique.
- clues: exactly ${config.clues} clues. Each has id ("clue_1", "clue_2", ...), text (at least 10 chars). Clues must be sequentially ordered and tell a progressive story. Do NOT directly state the culprit's name in any clue.
- hints: exactly ${config.hints} hints. Each has id ("hint_1", "hint_2", ...), text (at least 10 chars). Hints must guide the player without spoiling the solution. Do NOT directly state the culprit's name in any hint.
- solution: object with:
  - culpritId: matches one of the suspect ids
  - explanation: at least 50 characters, explaining the motive, method, and how the clues connect to solve the mystery. Must reference at least two specific clue IDs (e.g., "clue_1", "clue_3").

Return ONLY valid JSON with keys: title, story, suspects, clues, hints, solution.`;
};

export const generateMystery = async (premise, difficulty) => {
  const config = DIFFICULTY_CONFIG[difficulty];
  if (!config) {
    const err = new Error('Invalid difficulty level.');
    err.code = 'VALIDATION_ERROR';
    err.statusCode = 400;
    throw err;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && process.env.NODE_ENV !== 'test') {
    const err = new Error('GEMINI_API_KEY is not configured.');
    err.code = 'INTERNAL_SERVER_ERROR';
    err.statusCode = 500;
    throw err;
  }

  const ai = new GoogleGenAI({ apiKey: apiKey || 'test-key' });
  const prompt = buildPrompt(premise, difficulty);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text =
        response?.text ||
        (typeof response?.candidates?.[0]?.content?.parts?.[0]?.text === 'string'
          ? response.candidates[0].content.parts[0].text
          : '');

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const parsed = JSON.parse(text);
      const validated = GeminiMysterySchema.parse(parsed);

      // Verify exact count parity
      if (
        validated.suspects.length !== config.suspects ||
        validated.clues.length !== config.clues ||
        validated.hints.length !== config.hints
      ) {
        throw new Error(
          `Count mismatch: expected ${config.suspects} suspects, ${config.clues} clues, ${config.hints} hints`
        );
      }

      return validated;
    } catch (err) {
      // Non-retriable error checks
      const status = err.status || err.statusCode;
      const message = err.message || '';
      const isNonRetriable =
        status === 400 ||
        status === 401 ||
        status === 403 ||
        message.includes('API_KEY_INVALID') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('PERMISSION_DENIED');

      if (isNonRetriable) {
        throw err;
      }

      if (attempt === 3) {
        const generationError = new Error('Failed to generate a valid mystery after 3 attempts.');
        generationError.code = 'AI_GENERATION_FAILED';
        generationError.statusCode = 502;
        throw generationError;
      }

      // Backoff before retry
      const delay = attempt * 1000 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const failError = new Error('Failed to generate a valid mystery.');
  failError.code = 'AI_GENERATION_FAILED';
  failError.statusCode = 502;
  throw failError;
};

export default { generateMystery, buildPrompt };
