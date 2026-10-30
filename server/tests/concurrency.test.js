import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Case from '../src/models/Case.js';
import { connectTestDb, clearTestDb, closeTestDb } from './helpers/testDb.js';

describe('Concurrency & Idempotency Tests (§18.4)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const validPremise = 'A mysterious death occurred in the locked library on a stormy evening.';

  it('5 concurrent requests to discover clue_1 result in exactly one 200 and four 400s; bonus is +5 not +25', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    // Send 5 concurrent requests
    const promises = Array.from({ length: 5 }, () =>
      request(app)
        .post(`/api/cases/${_id}/clues/clue_1/discover`)
        .set('x-session-token', sessionToken)
        .set('x-skip-rate-limit', 'true')
    );

    const responses = await Promise.all(promises);

    const successResponses = responses.filter((r) => r.status === 200);
    const failureResponses = responses.filter((r) => r.status === 400);

    expect(successResponses.length).toBe(1);
    expect(failureResponses.length).toBe(4);
    failureResponses.forEach((r) => {
      expect(r.body.code).toBe('CLUE_ALREADY_DISCOVERED');
    });

    // Check DB directly
    const caseInDb = await Case.findById(_id);
    expect(caseInDb.score.clueBonus).toBe(5);
    expect(caseInDb.score.provisional).toBe(105);
  });

  it('sequential clue discovery isolation: discovering clue_2 targets clue_2 without altering clue_1', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    // 1. Discover clue_1
    await request(app)
      .post(`/api/cases/${_id}/clues/clue_1/discover`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    // 2. Discover clue_2
    const clue2Res = await request(app)
      .post(`/api/cases/${_id}/clues/clue_2/discover`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(clue2Res.status).toBe(200);
    expect(clue2Res.body.data.discoveredClue.id).toBe('clue_2');

    // 3. Inspect MongoDB document array directly
    const caseInDb = await Case.findById(_id);
    expect(caseInDb.clues[0].id).toBe('clue_1');
    expect(caseInDb.clues[0].discovered).toBe(true);
    expect(caseInDb.clues[1].id).toBe('clue_2');
    expect(caseInDb.clues[1].discovered).toBe(true);
    expect(caseInDb.clues[2].id).toBe('clue_3');
    expect(caseInDb.clues[2].discovered).toBe(false);

    expect(caseInDb.score.clueBonus).toBe(10);
    expect(caseInDb.score.provisional).toBe(110);
  });

  it('concurrent hint requests safely allocate distinct hints without lost updates', async () => {
    // Easy mystery has 2 hints
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const promises = Array.from({ length: 4 }, () =>
      request(app)
        .post(`/api/cases/${_id}/hints`)
        .set('x-session-token', sessionToken)
        .set('x-skip-rate-limit', 'true')
    );

    const responses = await Promise.all(promises);

    const successResponses = responses.filter((r) => r.status === 200);
    const exhaustedResponses = responses.filter((r) => r.status === 400);

    expect(successResponses.length).toBe(2);
    expect(exhaustedResponses.length).toBe(2);
    exhaustedResponses.forEach((r) => {
      expect(r.body.code).toBe('NO_HINTS_REMAINING');
    });

    const revealedHintIds = successResponses.map((r) => r.body.data.hint.id).sort();
    expect(revealedHintIds).toEqual(['hint_1', 'hint_2']);

    const caseInDb = await Case.findById(_id);
    expect(caseInDb.score.hintPenalty).toBe(-20);
    expect(caseInDb.score.provisional).toBe(80);
  });

  it('3 concurrent accusations result in exactly one 200 response and two 403 responses', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const promises = [
      request(app)
        .post(`/api/cases/${_id}/accuse`)
        .set('x-session-token', sessionToken)
        .set('x-skip-rate-limit', 'true')
        .send({ suspectId: 'suspect_3' }),
      request(app)
        .post(`/api/cases/${_id}/accuse`)
        .set('x-session-token', sessionToken)
        .set('x-skip-rate-limit', 'true')
        .send({ suspectId: 'suspect_3' }),
      request(app)
        .post(`/api/cases/${_id}/accuse`)
        .set('x-session-token', sessionToken)
        .set('x-skip-rate-limit', 'true')
        .send({ suspectId: 'suspect_3' }),
    ];

    const responses = await Promise.all(promises);

    const successResponses = responses.filter((r) => r.status === 200);
    const conflictResponses = responses.filter((r) => r.status === 403);

    expect(successResponses.length).toBe(1);
    expect(conflictResponses.length).toBe(2);
    conflictResponses.forEach((r) => {
      expect(r.body.code).toBe('CASE_ALREADY_COMPLETED');
    });

    const caseInDb = await Case.findById(_id);
    expect(caseInDb.status).toBe('completed');
  });
});
