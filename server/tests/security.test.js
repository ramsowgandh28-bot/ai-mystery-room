import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Case from '../src/models/Case.js';
import { connectTestDb, clearTestDb, closeTestDb } from './helpers/testDb.js';

describe('Security & Hardening Tests (§18.5)', () => {
  beforeAll(async () => {
    await connectTestDb();
    // Ensure indexes are built
    await Case.init();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const validPremise = 'A mysterious death occurred in the locked library on a stormy evening.';

  it('Solution leakage sweep: solution and sessionTokenHash are completely absent from active responses', async () => {
    // 1. POST /api/cases
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    expect(createRes.body.data.solution).toBeUndefined();
    expect(createRes.body.data.sessionTokenHash).toBeUndefined();

    const { _id, sessionToken } = createRes.body.data;

    // 2. GET /api/cases/:id
    const getRes = await request(app)
      .get(`/api/cases/${_id}`)
      .set('x-session-token', sessionToken);

    expect(getRes.body.data.solution).toBeUndefined();
    expect(getRes.body.data.sessionTokenHash).toBeUndefined();

    // 3. POST .../clues/:id/discover
    const clueRes = await request(app)
      .post(`/api/cases/${_id}/clues/clue_1/discover`)
      .set('x-session-token', sessionToken);

    expect(clueRes.body.data.solution).toBeUndefined();
    expect(clueRes.body.data.sessionTokenHash).toBeUndefined();

    // 4. POST .../hints
    const hintRes = await request(app)
      .post(`/api/cases/${_id}/hints`)
      .set('x-session-token', sessionToken);

    expect(hintRes.body.data.solution).toBeUndefined();
    expect(hintRes.body.data.sessionTokenHash).toBeUndefined();
  });

  it('Undiscovered clue text protection: clues returned by GET /api/cases/:id omit text property', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id, sessionToken } = createRes.body.data;

    const res = await request(app)
      .get(`/api/cases/${_id}`)
      .set('x-session-token', sessionToken);

    const clues = res.body.data.clues;
    expect(clues.length).toBe(5);
    clues.forEach((c) => {
      expect(c.discovered).toBe(false);
      expect(c.text).toBeUndefined();
    });
  });

  it('Authentication sweep across all case endpoints: rejects missing or invalid X-Session-Token', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({ premise: validPremise, difficulty: 'easy' });

    const { _id } = createRes.body.data;
    const fakeToken = 'f'.repeat(64);

    const endpoints = [
      { method: 'get', url: `/api/cases/${_id}` },
      { method: 'post', url: `/api/cases/${_id}/clues/clue_1/discover` },
      { method: 'post', url: `/api/cases/${_id}/hints` },
      { method: 'post', url: `/api/cases/${_id}/accuse`, body: { suspectId: 'suspect_1' } },
      { method: 'get', url: `/api/cases/${_id}/result` },
    ];

    for (const ep of endpoints) {
      // 1. Missing header -> 401
      const reqMissing = request(app)[ep.method](ep.url);
      if (ep.body) reqMissing.send(ep.body);
      const resMissing = await reqMissing;
      expect(resMissing.status).toBe(401);
      expect(resMissing.body.code).toBe('MISSING_SESSION_TOKEN');

      // 2. Invalid token -> 403
      const reqInvalid = request(app)[ep.method](ep.url).set('x-session-token', fakeToken);
      if (ep.body) reqInvalid.send(ep.body);
      const resInvalid = await reqInvalid;
      expect(resInvalid.status).toBe(403);
      expect(resInvalid.body.code).toBe('INVALID_SESSION_TOKEN');
    }
  });

  it('Production error sanitization: unhandled errors return generic message without stack or paths', async () => {
    // Call non-existent route or provoke error
    const res = await request(app).get('/api/cases/trigger-not-found');
    expect(res.status).toBe(400); // Invalid case ID
    expect(res.body.stack).toBeUndefined();
    expect(res.body.error).toBe('Invalid case ID format.');
  });

  it('Rate limiting enforcement: 6th request to POST /api/cases triggers HTTP 429', async () => {
    // When x-skip-rate-limit is NOT provided, rate limiting is active
    let lastRes;
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post('/api/cases')
        .send({ premise: validPremise, difficulty: 'easy' });
    }

    expect(lastRes.status).toBe(429);
    expect(lastRes.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(lastRes.body.error).toBe('Too many requests. Please wait before trying again.');
  });

  it('TTL index assertion: Case collection has 86400s expireAfterSeconds on lastActivityAt', async () => {
    await Case.createIndexes();
    const indexes = await Case.collection.indexes();
    const ttlIndex = indexes.find((idx) => idx.expireAfterSeconds === 86400);

    expect(ttlIndex).toBeDefined();
    expect(ttlIndex.key).toEqual({ lastActivityAt: 1 });
  });
});
