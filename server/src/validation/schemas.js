import { z } from 'zod';

export const DIFFICULTY_CONFIG = {
  easy: {
    suspects: 3,
    clues: 5,
    hints: 2,
    baseScore: 100,
  },
  medium: {
    suspects: 4,
    clues: 7,
    hints: 3,
    baseScore: 150,
  },
  hard: {
    suspects: 5,
    clues: 9,
    hints: 3,
    baseScore: 200,
  },
};

// ─── Client Request Schemas ──────────────────────────────────────────────────

export const CreateCaseSchema = z.object({
  premise: z
    .string({ required_error: 'Premise is required' })
    .trim()
    .min(10, 'Premise must be at least 10 characters.')
    .max(1000, 'Premise cannot exceed 1000 characters.'),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    required_error: 'Difficulty is required',
    invalid_type_error: "Difficulty must be 'easy', 'medium', or 'hard'",
  }),
});

export const AccuseSchema = z.object({
  suspectId: z
    .string({ required_error: 'Suspect ID is required' })
    .trim()
    .min(1, 'Suspect ID cannot be empty.'),
});

export const ClueIdParamSchema = z
  .string()
  .regex(/^clue_\d+$/, 'Invalid clue ID format.');

// ─── Gemini AI Output Schemas ────────────────────────────────────────────────

export const SuspectOutputSchema = z.object({
  id: z.string().regex(/^suspect_\d+$/),
  name: z.string().min(1).max(100),
  description: z.string().min(10),
  alibi: z.string().min(10),
});

export const ClueOutputSchema = z.object({
  id: z.string().regex(/^clue_\d+$/),
  text: z.string().min(10),
});

export const HintOutputSchema = z.object({
  id: z.string().regex(/^hint_\d+$/),
  text: z.string().min(10),
});

export const SolutionOutputSchema = z.object({
  culpritId: z.string().regex(/^suspect_\d+$/),
  explanation: z.string().min(50),
});

export const GeminiMysterySchema = z
  .object({
    title: z.string().min(1).max(200),
    story: z.string().min(50),
    suspects: z.array(SuspectOutputSchema),
    clues: z.array(ClueOutputSchema),
    hints: z.array(HintOutputSchema),
    solution: SolutionOutputSchema,
  })
  .superRefine((data, ctx) => {
    const suspectIds = data.suspects.map((s) => s.id);
    const clueIds = data.clues.map((c) => c.id);
    const hintIds = data.hints.map((h) => h.id);

    // 1. culpritId must reference a real suspect
    if (!suspectIds.includes(data.solution.culpritId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `culpritId "${data.solution.culpritId}" does not match any suspect id`,
      });
    }

    // 2. Suspect IDs must be unique
    if (new Set(suspectIds).size !== suspectIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate suspect IDs detected',
      });
    }

    // 3. Suspect names must be unique (case-insensitive)
    const lowerNames = data.suspects.map((s) => s.name.trim().toLowerCase());
    if (new Set(lowerNames).size !== lowerNames.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'All suspect names must be unique (case-insensitive)',
      });
    }

    // 4. Clue IDs must be unique
    if (new Set(clueIds).size !== clueIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate clue IDs detected',
      });
    }

    // 5. Hint IDs must be unique
    if (new Set(hintIds).size !== hintIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate hint IDs detected',
      });
    }

    // 6. IDs must be sequentially numbered starting at 1 with no gaps
    const checkSequential = (ids, prefix) => {
      for (let i = 0; i < ids.length; i++) {
        if (ids[i] !== `${prefix}_${i + 1}`) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${prefix} IDs are not sequential: expected ${prefix}_${i + 1}, got ${ids[i]}`,
          });
        }
      }
    };
    checkSequential(suspectIds, 'suspect');
    checkSequential(clueIds, 'clue');
    checkSequential(hintIds, 'hint');

    // 7. Explanation must cite at least TWO specific clue IDs (e.g., "clue_1", "clue_3")
    const referencedClues = clueIds.filter((cid) =>
      data.solution.explanation.includes(cid)
    );
    if (referencedClues.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Solution explanation must reference at least two specific clue IDs, but referenced ${referencedClues.length}`,
      });
    }

    // 8. No hint may directly name the culprit
    const culprit = data.suspects.find((s) => s.id === data.solution.culpritId);
    if (culprit) {
      const culpritNameLower = culprit.name.toLowerCase();
      data.hints.forEach((hint, i) => {
        if (hint.text.toLowerCase().includes(culpritNameLower)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `hint_${i + 1} directly reveals the culprit name "${culprit.name}"`,
          });
        }
      });

      // 9. No clue may directly name the culprit
      data.clues.forEach((clue, i) => {
        if (clue.text.toLowerCase().includes(culpritNameLower)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `clue_${i + 1} directly reveals the culprit name "${culprit.name}"`,
          });
        }
      });
    }
  });
