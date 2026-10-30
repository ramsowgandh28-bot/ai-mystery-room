import { describe, it, expect } from 'vitest';
import { GeminiMysterySchema } from '../src/validation/schemas.js';
import { mockEasyMystery } from './setup.js';

describe('GeminiMysterySchema Validation Tests (§18.6)', () => {
  it('valid easy mystery mock passes all validation', () => {
    const result = GeminiMysterySchema.safeParse(mockEasyMystery);
    expect(result.success).toBe(true);
  });

  it('culprit ID not in suspects fails with custom Zod issue', () => {
    const invalid = {
      ...mockEasyMystery,
      solution: {
        culpritId: 'suspect_99',
        explanation: 'Dr. Charles Pike poisoned the tea with clue_3 and escaped via clue_5.',
      },
    };
    const result = GeminiMysterySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.message.includes('does not match any suspect id'))).toBe(true);
  });

  it('duplicate suspect IDs fails validation', () => {
    const invalid = {
      ...mockEasyMystery,
      suspects: [
        { id: 'suspect_1', name: 'Arthur Vance', description: 'The long-serving loyal family butler', alibi: 'Preparing evening tea in pantry' },
        { id: 'suspect_1', name: 'Beatrice Lowe', description: 'The ambitious estranged niece', alibi: 'Reading historical novels alone' },
        { id: 'suspect_3', name: 'Charles Pike', description: 'The visiting personal physician', alibi: 'Walking through rainy rose garden' },
      ],
    };
    const result = GeminiMysterySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.message.includes('Duplicate suspect IDs'))).toBe(true);
  });

  it('case-insensitive duplicate suspect names fails validation', () => {
    const invalid = {
      ...mockEasyMystery,
      suspects: [
        { id: 'suspect_1', name: 'Arthur Vance', description: 'The long-serving loyal family butler', alibi: 'Preparing evening tea in pantry' },
        { id: 'suspect_2', name: 'arthur vance', description: 'The ambitious estranged niece', alibi: 'Reading historical novels alone' },
        { id: 'suspect_3', name: 'Charles Pike', description: 'The visiting personal physician', alibi: 'Walking through rainy rose garden' },
      ],
    };
    const result = GeminiMysterySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.message.includes('unique (case-insensitive)'))).toBe(true);
  });

  it('non-sequential clue IDs fails validation', () => {
    const invalid = {
      ...mockEasyMystery,
      clues: [
        { id: 'clue_1', text: 'A broken porcelain teacup was discovered shattered near the fireplace.' },
        { id: 'clue_3', text: 'Muddy leather boots were concealed behind the radiator.' },
        { id: 'clue_4', text: 'Traces of lethal digitalis were detected on teaspoon.' },
        { id: 'clue_5', text: 'A hidden ledger reveals exorbitant gambling debts.' },
        { id: 'clue_6', text: 'The physician medicine bag shows a freshly torn strap.' },
      ],
    };
    const result = GeminiMysterySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.message.includes('clue IDs are not sequential'))).toBe(true);
  });

  it('hint directly revealing culprit name fails validation', () => {
    const invalid = {
      ...mockEasyMystery,
      hints: [
        { id: 'hint_1', text: 'Charles Pike was seen holding the poison vial near the study.' },
        { id: 'hint_2', text: 'Review physical fabric evidence on the window latch.' },
      ],
    };
    const result = GeminiMysterySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.message.includes('directly reveals the culprit name'))).toBe(true);
  });

  it('clue directly revealing culprit name fails validation', () => {
    const invalid = {
      ...mockEasyMystery,
      clues: [
        { id: 'clue_1', text: 'A broken porcelain teacup was shattered by Charles Pike.' },
        { id: 'clue_2', text: 'Muddy leather boots were concealed behind the conservatory radiator.' },
        { id: 'clue_3', text: 'Traces of lethal digitalis were detected inside teaspoon residue.' },
        { id: 'clue_4', text: 'A hidden ledger reveals exorbitant gambling debts overdue before dawn.' },
        { id: 'clue_5', text: 'The physician medicine bag shows a freshly torn strap matching threads.' },
      ],
    };
    const result = GeminiMysterySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.message.includes('directly reveals the culprit name'))).toBe(true);
  });

  it('explanation citing fewer than 2 clue IDs fails validation', () => {
    const invalid = {
      ...mockEasyMystery,
      solution: {
        culpritId: 'suspect_3',
        explanation: 'Dr. Charles Pike poisoned the tea with digitalis as confirmed only by clue_3.',
      },
    };
    const result = GeminiMysterySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.message.includes('must reference at least two specific clue IDs'))).toBe(true);
  });
});
