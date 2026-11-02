import { GoogleGenAI } from '@google/genai';
import { GeminiMysterySchema, DIFFICULTY_CONFIG } from '../validation/schemas.js';

export const buildPrompt = (premise, difficulty) => {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;

  const exampleSuspects = [
    { id: 'suspect_1', name: 'Arthur Finch', description: 'The nervous estate accountant', alibi: 'Reviewing tax ledgers in the parlor' },
    { id: 'suspect_2', name: 'Beatrice Lowe', description: 'The visiting botanist cousin', alibi: 'Cataloging specimens in the greenhouse' },
    { id: 'suspect_3', name: 'Silas Drake', description: 'The quiet private chauffeur', alibi: 'Polishing the motorcar in the courtyard' },
    { id: 'suspect_4', name: 'Clara Oswald', description: 'The sharp-eyed antique dealer', alibi: 'Appraising portraits in the east wing' },
    { id: 'suspect_5', name: 'Marcus Vance', description: 'The estranged business partner', alibi: 'Making telephone calls from the study' },
  ].slice(0, config.suspects);

  const exampleClues = [
    { id: 'clue_1', text: 'A faint smell of rare jasmine oil lingers near the open vault door.' },
    { id: 'clue_2', text: 'Glass shards from the gallery window fell inward onto the carpet.' },
    { id: 'clue_3', text: 'A pair of botany tweezers was discovered discarded near the courtyard hedge.' },
    { id: 'clue_4', text: 'Tire tracks reveal the motorcar never left the driveway during the gala.' },
    { id: 'clue_5', text: 'A duplicate vault key was found hidden inside a terracotta flowerpot.' },
    { id: 'clue_6', text: 'The ledger pages for the current month have been hastily torn out.' },
    { id: 'clue_7', text: 'Muddy boot prints matching a size 7 shoe lead towards the greenhouse.' },
    { id: 'clue_8', text: 'Security logs indicate the vault alarm was deactivated with the master passcode.' },
    { id: 'clue_9', text: 'Fibers from an embroidered velvet cloak were snagged on the safe latch.' },
  ].slice(0, config.clues);

  const exampleHints = [
    { id: 'hint_1', text: 'Pay close attention to botanical traces left behind at the crime scene.' },
    { id: 'hint_2', text: 'Compare the physical evidence with the hobbies and tools of the guests.' },
    { id: 'hint_3', text: 'Consider who had specialized knowledge of the plants and the grounds.' },
  ].slice(0, config.hints);

  const formatExample = JSON.stringify(
    {
      title: 'The Stolen Emerald of Blackwood Manor',
      story: 'During an autumn gala at Blackwood Manor, the host announced that a priceless emerald had vanished from the display vault.',
      suspects: exampleSuspects,
      clues: exampleClues,
      hints: exampleHints,
      solution: {
        culpritId: 'suspect_2',
        explanation: 'The jasmine fragrance in clue_1 and the dropped tweezers in clue_3 directly link to the visiting botanist. The hidden key in clue_5 confirms suspect_2 committed the theft.',
      },
    },
    null,
    2
  );

  return `You are a master mystery writer AI. Generate a complete murder mystery case in strict JSON format.

Premise: ${premise}
Difficulty: ${difficulty}

Rules and Requirements:
1. title: Catchy, thematic mystery title string (up to 200 chars).
2. story: Rich setting and circumstances string establishing the crime (at least 50 chars).
3. suspects: Exactly ${config.suspects} suspects. Each suspect object must have:
   - "id": exactly "suspect_1", "suspect_2", ... sequentially numbered up to "suspect_${config.suspects}".
   - "name": distinct full name (e.g. "Arthur Finch"). If the premise names a person (e.g. the victim or estate owner), do NOT make them the culprit.
   - "description": physical description and background (at least 10 chars).
   - "alibi": claimed whereabouts during the crime (at least 10 chars).
4. clues: Exactly ${config.clues} clues. Each clue object must have:
   - "id": exactly "clue_1", "clue_2", ... sequentially numbered up to "clue_${config.clues}".
   - "text": progressive physical or forensic evidence (at least 10 chars).
   - CRITICAL CULPRIT SECRECY: The culprit's name, first name, and last name must NEVER appear in ANY clue text! Clues must refer to evidence (footprints, poisons, dropped items, alibi flaws) without naming the culprit.
5. hints: Exactly ${config.hints} hints. Each hint object must have:
   - "id": exactly "hint_1", "hint_2", ... sequentially numbered up to "hint_${config.hints}".
   - "text": guidance for the investigator (at least 10 chars).
   - CRITICAL CULPRIT SECRECY: The culprit's name, first name, and last name must NEVER appear in ANY hint text!
6. solution: An object with:
   - "culpritId": string matching one suspect id (e.g. "suspect_2").
   - "explanation": at least 50 characters explaining motive, method, and how clues connect. CRITICAL: The explanation MUST explicitly cite at least two clue IDs using their exact lowercase identifiers (e.g. "clue_1 and clue_3 prove that...").

Format Example for ${difficulty} difficulty (MUST match these exact counts: ${config.suspects} suspects, ${config.clues} clues, ${config.hints} hints):
${formatExample}

Return ONLY raw JSON matching this structure with exactly ${config.suspects} suspects, ${config.clues} clues, and ${config.hints} hints.`;
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

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      let cleanText = (
        response?.text ||
        (typeof response?.candidates?.[0]?.content?.parts?.[0]?.text === 'string'
          ? response.candidates[0].content.parts[0].text
          : '')
      ).trim();

      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      } else if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }

      if (!cleanText) {
        throw new Error('Empty response from Gemini API');
      }

      const parsed = JSON.parse(cleanText);
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
      console.error(`[Gemini Attempt ${attempt} failed]:`, err.message);
      if (err.issues) {
        console.error('[Gemini Validation Issues]:', JSON.stringify(err.issues));
      }

      // Non-retriable error checks
      const status = err.status || err.statusCode;
      const message = err.message || '';
      const isNonRetriable =
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 429 ||
        message.includes('API_KEY_INVALID') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('PERMISSION_DENIED');

      if (isNonRetriable) {
        const generationError = new Error(err.message || 'Upstream AI generation failed.');
        generationError.code = 'AI_GENERATION_FAILED';
        generationError.statusCode = 502;
        throw generationError;
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
