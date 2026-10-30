import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, closeTestDb } from './helpers/testDb.js';

describe('Production Smoke Tests (Phase 5 Roadmap Step 5.4)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('Smoke-01: Health check endpoint returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('Smoke-02: 404 handler returns standardized JSON on unknown route', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('Smoke-03: Full game loop (Easy difficulty: create -> inspect -> clues -> hint -> accuse -> results)', async () => {
    // 1. Create mystery
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({
        premise: 'A priceless emerald is stolen from the manor garden conservatory during a moonlit gala.',
        difficulty: 'easy',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const caseId = createRes.body.data._id;
    const sessionToken = createRes.body.data.sessionToken;
    expect(caseId).toBeDefined();
    expect(sessionToken).toHaveLength(64);
    expect(createRes.body.data.solution).toBeUndefined(); // Never exposed

    // 2. Fetch case before accusation
    const getRes = await request(app)
      .get(`/api/cases/${caseId}`)
      .set('X-Session-Token', sessionToken);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.solution).toBeUndefined();
    expect(getRes.body.data.suspects).toHaveLength(3);
    expect(getRes.body.data.clues).toHaveLength(5);
    expect(getRes.body.data.score.provisional).toBe(100);

    // 3. Attempt direct result fetch before accusation -> expect 403
    const prematureResultRes = await request(app)
      .get(`/api/cases/${caseId}/result`)
      .set('X-Session-Token', sessionToken);
    expect(prematureResultRes.status).toBe(403);
    expect(prematureResultRes.body.code).toBe('RESULT_NOT_AVAILABLE');

    // 4. Discover clue_1 sequentially
    const clueRes = await request(app)
      .post(`/api/cases/${caseId}/clues/clue_1/discover`)
      .set('X-Session-Token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(clueRes.status).toBe(200);
    expect(clueRes.body.data.discoveredClue.id).toBe('clue_1');
    expect(clueRes.body.data.score.clueBonus).toBe(5);
    expect(clueRes.body.data.score.provisional).toBe(105);

    // 5. Request hint
    const hintRes = await request(app)
      .post(`/api/cases/${caseId}/hints`)
      .set('X-Session-Token', sessionToken)
      .set('x-skip-rate-limit', 'true');

    expect(hintRes.status).toBe(200);
    expect(hintRes.body.data.hint.used).toBe(true);
    expect(hintRes.body.data.score.hintPenalty).toBe(-10);
    expect(hintRes.body.data.score.provisional).toBe(95);

    // 6. Submit correct accusation (suspect_3 is the mock culprit)
    const accuseRes = await request(app)
      .post(`/api/cases/${caseId}/accuse`)
      .set('X-Session-Token', sessionToken)
      .set('x-skip-rate-limit', 'true')
      .send({ suspectId: 'suspect_3' });

    expect(accuseRes.status).toBe(200);
    expect(accuseRes.body.data.isCorrect).toBe(true);
    expect(accuseRes.body.data.verdict).toBe('correct');
    expect(accuseRes.body.data.score.final).toBe(95);
    expect(accuseRes.body.data.solution.culpritId).toBe('suspect_3');

    // 7. Retrieve final results
    const resultRes = await request(app)
      .get(`/api/cases/${caseId}/result`)
      .set('X-Session-Token', sessionToken);

    expect(resultRes.status).toBe(200);
    expect(resultRes.body.data.culprit.name).toBe('Charles Pike');
    expect(resultRes.body.data.solution.explanation).toBeDefined();
    expect(resultRes.body.data.score.final).toBe(95);
    expect(resultRes.body.data.clues).toHaveLength(5);
  });

  it('Smoke-04: Mystery generation works for Medium and Hard difficulties', async () => {
    const medRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({
        premise: 'A tech developer is murdered in a secured server cleanroom with no forced entry.',
        difficulty: 'medium',
      });
    expect(medRes.status).toBe(201);
    expect(medRes.body.data.suspects).toHaveLength(4);
    expect(medRes.body.data.clues).toHaveLength(7);
    expect(medRes.body.data.hints.total).toBe(3);

    const hardRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({
        premise: 'A secret treaty document disappears from a diplomatic convoy passing through the mountain pass.',
        difficulty: 'hard',
      });
    expect(hardRes.status).toBe(201);
    expect(hardRes.body.data.suspects).toHaveLength(5);
    expect(hardRes.body.data.clues).toHaveLength(9);
    expect(hardRes.body.data.hints.total).toBe(3);
  });

  it('Smoke-05: Missing or invalid session tokens are rejected', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .set('x-skip-rate-limit', 'true')
      .send({
        premise: 'An antique sculpture is missing from an artist loft after a blackout.',
        difficulty: 'easy',
      });
    const caseId = createRes.body.data._id;

    // Missing token
    const missingRes = await request(app).get(`/api/cases/${caseId}`);
    expect(missingRes.status).toBe(401);
    expect(missingRes.body.code).toBe('MISSING_SESSION_TOKEN');

    // Invalid token
    const invalidRes = await request(app)
      .get(`/api/cases/${caseId}`)
      .set('X-Session-Token', '0000000000000000000000000000000000000000000000000000000000000000');
    expect(invalidRes.status).toBe(403);
    expect(invalidRes.body.code).toBe('INVALID_SESSION_TOKEN');
  });
});
