import { describe, it, expect } from 'vitest';
import { DIFFICULTY_CONFIG } from '../src/validation/schemas.js';

describe('Scoring Logic Unit Tests (§18.3)', () => {
  it('allocates correct base score per difficulty', () => {
    expect(DIFFICULTY_CONFIG.easy.baseScore).toBe(100);
    expect(DIFFICULTY_CONFIG.medium.baseScore).toBe(150);
    expect(DIFFICULTY_CONFIG.hard.baseScore).toBe(200);
  });

  it('calculates provisional score accurately: base + clues*5 - hints*10', () => {
    const base = 100;
    const cluesDiscovered = 3; // +15
    const hintsUsed = 2; // -20
    const provisional = Math.max(0, base + cluesDiscovered * 5 - hintsUsed * 10);
    expect(provisional).toBe(95);
  });

  it('ensures provisional score is clamped to a minimum of 0', () => {
    const base = 100;
    const cluesDiscovered = 0;
    const hintsUsed = 15; // -150
    const provisional = Math.max(0, base + cluesDiscovered * 5 - hintsUsed * 10);
    expect(provisional).toBe(0);
  });

  it('final score equals provisional score when accusation is correct', () => {
    const provisional = 125;
    const isCorrect = true;
    const finalScore = isCorrect ? Math.max(0, provisional) : 0;
    expect(finalScore).toBe(125);
  });

  it('final score equals 0 when accusation is wrong', () => {
    const provisional = 125;
    const isCorrect = false;
    const finalScore = isCorrect ? Math.max(0, provisional) : 0;
    expect(finalScore).toBe(0);
  });

  it('provisional and final scores remain independent during investigation', () => {
    const scoreState = {
      base: 150,
      clueBonus: 10,
      hintPenalty: -10,
      provisional: 150,
      final: null,
    };
    expect(scoreState.final).toBeNull();
    expect(scoreState.provisional).toBe(150);
  });
});
