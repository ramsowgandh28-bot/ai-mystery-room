import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './helpers/testDb.js';

describe('Cases Endpoints Integration Tests (§18.2)', () => {
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

  it('POST /api/cases — creates valid easy mystery with 64-char token and no solution leaked', async () => {
    const res = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionToken).toBeDefined();
    expect(res.body.data.sessionToken).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.data.solution).toBeUndefined();
    expect(res.body.data.sessionTokenHash).toBeUndefined();
    expect(res.body.data.score.base).toBe(100);
    expect(res.body.data.score.provisional).toBe(100);
    expect(res.body.data.clues[0].text).toBeUndefined(); // undiscovered clues have no text
  });

  it('POST /api/cases — creates valid medium mystery with 4 suspects, 7 clues, 3 hints', async () => {
    const res = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'medium' });

    expect(res.status).toBe(201);
    expect(res.body.data.suspects.length).toBe(4);
    expect(res.body.data.clues.length).toBe(7);
    expect(res.body.data.hints.total).toBe(3);
    expect(res.body.data.score.base).toBe(150);
  });

  it('POST /api/cases — creates valid hard mystery with 5 suspects, 9 clues, 3 hints', async () => {
    const res = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'hard' });

    expect(res.status).toBe(201);
    expect(res.body.data.suspects.length).toBe(5);
    expect(res.body.data.clues.length).toBe(9);
    expect(res.body.data.hints.total).toBe(3);
    expect(res.body.data.score.base).toBe(200);
  });

  it('POST /api/cases — rejects premise too short (<10 chars) with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: 'Too short', difficulty: 'easy' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/cases — rejects invalid difficulty with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'impossible' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/cases/:id — retrieves active case with valid token, hiding solution and undiscovered clue text', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const res = await request(app)
      .get(`/api/cases/${_id}`)
      .set('x-session-token', sessionToken);

    expect(res.status).toBe(200);
    expect(res.body.data.solution).toBeUndefined();
    expect(res.body.data.sessionTokenHash).toBeUndefined();
    expect(res.body.data.clues.every((c) => !c.discovered && c.text === undefined)).toBe(true);
  });

  it('GET /api/cases/:id — returns 401 MISSING_SESSION_TOKEN when header is omitted', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id } = createRes.body.data;

    const res = await request(app).get(`/api/cases/${_id}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MISSING_SESSION_TOKEN');
  });

  it('GET /api/cases/:id — returns 403 INVALID_SESSION_TOKEN when wrong token is provided', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id } = createRes.body.data;
    const fakeToken = '0'.repeat(64);

    const res = await request(app)
      .get(`/api/cases/${_id}`)
      .set('x-session-token', fakeToken);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INVALID_SESSION_TOKEN');
  });

  it('GET /api/cases/:id — returns 400 MALFORMED_SESSION_TOKEN when token is not 64 hex chars', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id } = createRes.body.data;

    const res = await request(app)
      .get(`/api/cases/${_id}`)
      .set('x-session-token', 'short-token');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MALFORMED_SESSION_TOKEN');
  });

  it('GET /api/cases/:id — returns 400 INVALID_CASE_ID when ID is not valid ObjectId', async () => {
    const res = await request(app)
      .get('/api/cases/invalid-id-123')
      .set('x-session-token', 'a'.repeat(64));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_CASE_ID');
  });

  it('GET /api/cases/:id — returns 404 CASE_NOT_FOUND when case does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .get(`/api/cases/${fakeId}`)
      .set('x-session-token', 'a'.repeat(64));

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CASE_NOT_FOUND');
  });

  it('POST .../clues/:clueId/discover — discovers clue_1 and awards +5 provisional score', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const res = await request(app)
      .post(`/api/cases/${_id}/clues/clue_1/discover`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(res.status).toBe(200);
    expect(res.body.data.discoveredClue.id).toBe('clue_1');
    expect(res.body.data.discoveredClue.text).toBeDefined();
    expect(res.body.data.score.clueBonus).toBe(5);
    expect(res.body.data.score.provisional).toBe(105);
  });

  it('POST .../clues/:clueId/discover — rejects clue_2 before clue_1 with 400 SEQUENTIAL_ORDER_VIOLATION', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const res = await request(app)
      .post(`/api/cases/${_id}/clues/clue_2/discover`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SEQUENTIAL_ORDER_VIOLATION');
  });

  it('POST .../clues/:clueId/discover — rejects already discovered clue with 400 CLUE_ALREADY_DISCOVERED', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    // Discover clue_1
    await request(app)
      .post(`/api/cases/${_id}/clues/clue_1/discover`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    // Attempt discovering clue_1 again
    const res = await request(app)
      .post(`/api/cases/${_id}/clues/clue_1/discover`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CLUE_ALREADY_DISCOVERED');
  });

  it('POST .../hints — sequentially consumes hints and decrements 10 points', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const hint1 = await request(app)
      .post(`/api/cases/${_id}/hints`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(hint1.status).toBe(200);
    expect(hint1.body.data.hint.id).toBe('hint_1');
    expect(hint1.body.data.hintsRemaining).toBe(1);
    expect(hint1.body.data.score.hintPenalty).toBe(-10);
    expect(hint1.body.data.score.provisional).toBe(90);

    const hint2 = await request(app)
      .post(`/api/cases/${_id}/hints`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(hint2.status).toBe(200);
    expect(hint2.body.data.hint.id).toBe('hint_2');
    expect(hint2.body.data.hintsRemaining).toBe(0);

    // All hints consumed -> 400 NO_HINTS_REMAINING
    const hint3 = await request(app)
      .post(`/api/cases/${_id}/hints`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(hint3.status).toBe(400);
    expect(hint3.body.code).toBe('NO_HINTS_REMAINING');
  });

  it('POST .../accuse — rejects invalid suspectId with 400 INVALID_SUSPECT_ID while keeping case active', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const res = await request(app)
      .post(`/api/cases/${_id}/accuse`)
      .set('x-session-token', sessionToken)
      .send({ suspectId: 'suspect_99' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SUSPECT_ID');

    // Verify case remains active
    const checkCase = await request(app)
      .get(`/api/cases/${_id}`)
      .set('x-session-token', sessionToken);

    expect(checkCase.body.data.status).toBe('active');
  });

  it('POST .../accuse — correct accusation finalizes case and awards full provisional score', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    // Dr. Charles Pike is suspect_3 in setup.js mock
    const res = await request(app)
      .post(`/api/cases/${_id}/accuse`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true')
      .send({ suspectId: 'suspect_3' });

    expect(res.status).toBe(200);
    expect(res.body.data.isCorrect).toBe(true);
    expect(res.body.data.score.final).toBe(100);
    expect(res.body.data.solution.culpritId).toBe('suspect_3');
  });

  it('POST .../accuse — wrong accusation finalizes case with score.final = 0', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const res = await request(app)
      .post(`/api/cases/${_id}/accuse`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true')
      .send({ suspectId: 'suspect_1' });

    expect(res.status).toBe(200);
    expect(res.body.data.isCorrect).toBe(false);
    expect(res.body.data.score.final).toBe(0);
  });

  it('POST .../accuse — second accusation attempt rejected with 403 CASE_ALREADY_COMPLETED', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    await request(app)
      .post(`/api/cases/${_id}/accuse`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true')
      .send({ suspectId: 'suspect_3' });

    const secondRes = await request(app)
      .post(`/api/cases/${_id}/accuse`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true')
      .send({ suspectId: 'suspect_3' });

    expect(secondRes.status).toBe(403);
    expect(secondRes.body.code).toBe('CASE_ALREADY_COMPLETED');
  });

  it('GET .../result — rejects before accusation with 403 RESULT_NOT_AVAILABLE', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const res = await request(app)
      .get(`/api/cases/${_id}/result`)
      .set('x-session-token', sessionToken);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESULT_NOT_AVAILABLE');
  });

  it('GET .../result — succeeds after accusation revealing all clues with text and full solution', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    await request(app)
      .post(`/api/cases/${_id}/accuse`)
      .set('x-session-token', sessionToken)
      .set('x-skip-rate-limit', 'true')
      .send({ suspectId: 'suspect_3' });

    const res = await request(app)
      .get(`/api/cases/${_id}/result`)
      .set('x-session-token', sessionToken);

    expect(res.status).toBe(200);
    expect(res.body.data.solution.explanation).toBeDefined();
    expect(res.body.data.culprit.id).toBe('suspect_3');
    expect(res.body.data.clues.every((c) => typeof c.text === 'string' && c.text.length > 0)).toBe(true);
  });
});
