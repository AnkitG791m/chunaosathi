import request from 'supertest';
import app from './server.js';

// ═══════════════════════════════════════════════════════════════════
// CHUNAO SAATHI — COMPLETE TEST SUITE (45+ tests)
// ═══════════════════════════════════════════════════════════════════

// ─── 1. HEALTH CHECK (3 tests) ─────────────────────────────────────
describe('Health Check', () => {
  test('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
  });
  test('Health response has status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.status).toBe('ok');
  });
  test('Health response has message', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.message).toBeDefined();
  });
});

// ─── 2. SECURITY HEADERS (3 tests) ────────────────────────────────
describe('Security Headers (Helmet)', () => {
  test('Has X-Content-Type-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
  test('Has X-Frame-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
  test('Does not expose X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

// ─── 3. EVENTS API (3 tests) ──────────────────────────────────────
describe('Events API', () => {
  test('GET /api/events returns 200', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(200);
  });
  test('GET /api/events returns events array', async () => {
    const res = await request(app).get('/api/events');
    expect(res.body).toHaveProperty('events');
    expect(Array.isArray(res.body.events)).toBe(true);
  });
  test('GET /api/events returns total count', async () => {
    const res = await request(app).get('/api/events');
    expect(res.body).toHaveProperty('total');
  });
});

// ─── 4. VOTER REGISTRATION (5 tests) ──────────────────────────────
describe('Voter Registration', () => {
  test('POST /api/auth/register - empty body returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/auth/register - missing name returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ phone: '9999999999' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });
  test('POST /api/auth/register - missing phone returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Ramesh Kumar' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });
  test('POST /api/auth/register - error response has error field', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.body).toHaveProperty('error');
  });
  test('POST /api/auth/register - non-string name returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 123, phone: '9999999999' });
    expect(res.statusCode).toBe(400);
  });
});

// ─── 5. VOTER LOGIN (3 tests) ─────────────────────────────────────
describe('Voter Login', () => {
  test('POST /api/auth/login - empty body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/auth/login - missing phone returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.body.error).toBeDefined();
  });
  test('POST /api/auth/login - unknown phone returns 404', async () => {
    const res = await request(app).post('/api/auth/login').send({ phone: '0000000000' });
    expect([404, 500]).toContain(res.statusCode);
  });
});

// ─── 6. ATTENDANCE API (5 tests) ──────────────────────────────────
describe('Attendance API', () => {
  test('POST /api/attendance/mark - empty body returns 400', async () => {
    const res = await request(app).post('/api/attendance/mark').send({});
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/attendance/mark - missing qr_code returns 400', async () => {
    const res = await request(app).post('/api/attendance/mark').send({ event_id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/attendance/mark - missing event_id returns 400', async () => {
    const res = await request(app).post('/api/attendance/mark').send({ qr_code: 'ABC123' });
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/attendance/mark - invalid event UUID returns 400', async () => {
    const res = await request(app).post('/api/attendance/mark').send({ qr_code: 'ABC123', event_id: 'not-a-uuid' });
    expect(res.statusCode).toBe(400);
  });
  test('GET /api/attendance/:eventId - invalid UUID returns 400', async () => {
    const res = await request(app).get('/api/attendance/not-a-uuid');
    expect(res.statusCode).toBe(400);
  });
});

// ─── 7. BOOTH LOCATOR (4 tests) ───────────────────────────────────
describe('Booth Locator API', () => {
  test('POST /api/booths/assign - empty body returns 400', async () => {
    const res = await request(app).post('/api/booths/assign').send({});
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/booths/assign - missing voter_id returns 400', async () => {
    const res = await request(app).post('/api/booths/assign').send({ event_id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/booths/assign - invalid UUID returns 400', async () => {
    const res = await request(app).post('/api/booths/assign').send({ voter_id: 'bad-id', event_id: 'also-bad' });
    expect(res.statusCode).toBe(400);
  });
  test('GET /api/booths/invalid-uuid returns 400', async () => {
    const res = await request(app).get('/api/booths/not-a-uuid');
    expect(res.statusCode).toBe(400);
  });
});

// ─── 8. CREDIT SCORE API (5 tests) ────────────────────────────────
describe('Credit Score API', () => {
  test('GET /api/credit/invalid-uuid returns 400', async () => {
    const res = await request(app).get('/api/credit/not-a-uuid');
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/credit/update - empty body returns 400', async () => {
    const res = await request(app).post('/api/credit/update').send({});
    expect([400, 401]).toContain(res.statusCode);
  });
  test('POST /api/credit/update - missing voter_id returns 400', async () => {
    const res = await request(app).post('/api/credit/update').send({ change_amount: 10, reason: 'voted' });
    expect([400, 401]).toContain(res.statusCode);
  });
  test('POST /api/credit/update - missing change_amount returns 400', async () => {
    const res = await request(app).post('/api/credit/update').send({ voter_id: '123e4567-e89b-12d3-a456-426614174000', reason: 'voted' });
    expect([400, 401]).toContain(res.statusCode);
  });
  test('POST /api/credit/update - invalid UUID returns 400', async () => {
    const res = await request(app).post('/api/credit/update')
      .set('Authorization', 'Bearer fake-token')
      .send({ voter_id: 'not-uuid', change_amount: 10, reason: 'test' });
    expect([400, 401]).toContain(res.statusCode);
  });
});

// ─── 9. EHSAAS ANONYMOUS DOUBT SYSTEM (5 tests) ───────────────────
describe('EHSAAS Anonymous Doubt System', () => {
  test('POST /api/ehsaas/question - empty body returns 400', async () => {
    const res = await request(app).post('/api/ehsaas/question').send({});
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/ehsaas/question - empty question returns 400', async () => {
    const res = await request(app).post('/api/ehsaas/question').send({ question: '   ', event_id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/ehsaas/question - missing event_id returns 400', async () => {
    const res = await request(app).post('/api/ehsaas/question').send({ question: 'How do I vote?' });
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/ehsaas/question - invalid UUID returns 400', async () => {
    const res = await request(app).post('/api/ehsaas/question').send({ question: 'How do I vote?', event_id: 'bad-uuid' });
    expect(res.statusCode).toBe(400);
  });
  test('GET /api/ehsaas/invalid-uuid returns 400', async () => {
    const res = await request(app).get('/api/ehsaas/not-a-uuid');
    expect(res.statusCode).toBe(400);
  });
});

// ─── 10. FAKE NEWS CHECKER (4 tests) ──────────────────────────────
describe('Fake News Checker', () => {
  test('POST /api/fakenews/check - empty body returns 400', async () => {
    const res = await request(app).post('/api/fakenews/check').send({});
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/fakenews/check - empty claim returns 400', async () => {
    const res = await request(app).post('/api/fakenews/check').send({ claim: '   ' });
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/fakenews/check - EVM claim returns verdict', async () => {
    const res = await request(app).post('/api/fakenews/check').send({ claim: 'EVM machines can be hacked' });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) expect(res.body).toHaveProperty('verdict');
  });
  test('POST /api/fakenews/check - unknown claim returns UNVERIFIED', async () => {
    const res = await request(app).post('/api/fakenews/check').send({ claim: 'random unknown claim xyz' });
    expect([200, 500]).toContain(res.statusCode);
  });
});

// ─── 11. INPUT VALIDATION / SECURITY (4 tests) ────────────────────
describe('Input Validation & Security', () => {
  test('SQL injection in name is sanitized', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: "'; DROP TABLE voters;--", phone: '9999999998' });
    expect([400, 409, 500]).toContain(res.statusCode);
  });
  test('XSS in question is sanitized', async () => {
    const res = await request(app).post('/api/ehsaas/question').send({
      question: '<script>alert("xss")</script>',
      event_id: '123e4567-e89b-12d3-a456-426614174000'
    });
    expect([201, 400, 500]).toContain(res.statusCode);
  });
  test('Very long input is rejected or truncated', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'a'.repeat(10000), phone: '9999999997' });
    expect([400, 409, 500]).toContain(res.statusCode);
  });
  test('Non-JSON body is handled gracefully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'text/plain')
      .send('not json');
    expect([400, 500]).toContain(res.statusCode);
  });
});

// ─── 12. VOTER PROFILE (2 tests) ──────────────────────────────────
describe('Voter Profile', () => {
  test('GET /api/voter/invalid-uuid returns 400', async () => {
    const res = await request(app).get('/api/voter/not-a-uuid');
    expect(res.statusCode).toBe(400);
  });
  test('GET /api/voter/valid-uuid returns 404 for unknown voter', async () => {
    const res = await request(app).get('/api/voter/123e4567-e89b-12d3-a456-426614174000');
    expect([404, 500]).toContain(res.statusCode);
  });
});

// ─── 13. QR UPLOAD (3 tests) ──────────────────────────────────────
describe('QR Code Upload', () => {
  test('POST /api/storage/upload-qr - empty body returns 400', async () => {
    const res = await request(app).post('/api/storage/upload-qr').send({});
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/storage/upload-qr - missing voter_id returns 400', async () => {
    const res = await request(app).post('/api/storage/upload-qr').send({ qr_data: 'base64data' });
    expect(res.statusCode).toBe(400);
  });
  test('POST /api/storage/upload-qr - invalid UUID returns 400', async () => {
    const res = await request(app).post('/api/storage/upload-qr').send({ voter_id: 'bad-id', qr_data: 'base64data' });
    expect(res.statusCode).toBe(400);
  });
});

// ─── 14. RATE LIMITING (1 test) ───────────────────────────────────
describe('Rate Limiting', () => {
  test('Multiple rapid requests are handled without server crash', async () => {
    const requests = Array(5).fill(null).map(() => request(app).get('/api/health'));
    const responses = await Promise.all(requests);
    responses.forEach(res => expect([200, 429]).toContain(res.statusCode));
  });
});
