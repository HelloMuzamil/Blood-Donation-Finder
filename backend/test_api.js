/**
 * test_api.js — BloodConnect API Test Suite
 *
 * Tests every endpoint for correct auth enforcement and expected behaviour.
 * Run:  node test_api.js
 *
 * Requires the server to be running on PORT (default 5000).
 */

require('dotenv').config();
const http = require('http');
const https = require('https');

const BASE_URL  = `http://localhost:${process.env.PORT || 5000}`;
const TIMESTAMP = Date.now();
const TEST_EMAIL = `testuser_${TIMESTAMP}@bloodconnect.test`;
const TEST_PASS  = 'Test@1234';

// ── Utilities ─────────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve) => {
    const url     = new URL(BASE_URL + path);
    const isHttps = url.protocol === 'https:';
    const lib     = isHttps ? https : http;
    const data    = body ? JSON.stringify(body) : null;

    const options = {
      hostname : url.hostname,
      port     : url.port || (isHttps ? 443 : 80),
      path     : url.pathname + url.search,
      method,
      headers  : {
        'Content-Type': 'application/json',
        ...(data  ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` }          : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json = {};
        try { json = JSON.parse(raw); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, body: json, raw });
      });
    });

    req.on('error', (e) => resolve({ status: 0, body: {}, raw: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

const PASS  = '✅ PASS';
const FAIL  = '❌ FAIL';
let passed  = 0;
let failed  = 0;
const log   = [];

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (ok) { passed++; log.push(`  ${PASS}  ${name}`); }
  else     { failed++; log.push(`  ${FAIL}  ${name}${detail ? '  →  ' + detail : ''}`); }
  return ok;
}

function section(title) {
  log.push('');
  log.push(`── ${title} ──────────────────────────────────────`);
}

// ── State shared across tests ─────────────────────────────────────────────────

let userToken  = null;
let adminToken = null;
let userId     = null;
let requestId  = null;
let donorId    = null;
let notifId    = null;

// ── Test Functions ────────────────────────────────────────────────────────────

async function testHealth() {
  section('Health Check');
  const r = await request('GET', '/api/health');
  check('GET /api/health → 200', r.status === 200, `got ${r.status}`);
  check('GET /api/health → success:true', r.body.success === true);
}

async function testAuthRegister() {
  section('Auth — Register');

  // Missing required fields
  const r1 = await request('POST', '/api/auth/register', { email: TEST_EMAIL });
  check('POST /register missing fields → 422', r1.status === 422, `got ${r1.status}`);
  check('POST /register missing fields has field', !!r1.body.field);

  // Valid registration
  const r2 = await request('POST', '/api/auth/register', {
    first_name : 'Test',
    last_name  : 'User',
    email      : TEST_EMAIL,
    password   : TEST_PASS,
    blood_group: 'A+',
    city       : 'Lahore',
    role       : 'donor',
  });
  check('POST /register valid → 201', r2.status === 201, `got ${r2.status}`);
  check('POST /register returns token', !!r2.body.token);
  check('POST /register returns user.id', !!r2.body.user?.id);

  if (r2.body.token) {
    userToken = r2.body.token;
    userId    = r2.body.user.id;
  }

  // Duplicate email
  const r3 = await request('POST', '/api/auth/register', {
    first_name : 'Test',
    last_name  : 'User',
    email      : TEST_EMAIL,
    password   : TEST_PASS,
    blood_group: 'A+',
    city       : 'Lahore',
  });
  check('POST /register duplicate email → 409', r3.status === 409, `got ${r3.status}`);
}

async function testAuthLogin() {
  section('Auth — Login');

  // Bad credentials — use valid format password but wrong value
  const r1 = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: 'WrongPass1!' });
  check('POST /login wrong password → 401', r1.status === 401, `got ${r1.status}`);

  // Missing password → 422 (validation error)
  const r2 = await request('POST', '/api/auth/login', { email: TEST_EMAIL });
  check('POST /login missing password → 422', r2.status === 422, `got ${r2.status}`);

  // Valid login
  const r3 = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
  check('POST /login valid → 200', r3.status === 200, `got ${r3.status}`);
  check('POST /login returns token', !!r3.body.token);

  if (r3.body.token) userToken = r3.body.token;
}

async function testAuthMe() {
  section('Auth — GET /me');

  // No token
  const r1 = await request('GET', '/api/auth/me');
  check('GET /auth/me no token → 401', r1.status === 401, `got ${r1.status}`);

  // Invalid token
  const r2 = await request('GET', '/api/auth/me', null, 'badtoken');
  check('GET /auth/me bad token → 401', r2.status === 401, `got ${r2.status}`);

  // Valid token
  const r3 = await request('GET', '/api/auth/me', null, userToken);
  check('GET /auth/me valid token → 200', r3.status === 200, `got ${r3.status}`);
  check('GET /auth/me returns user', !!r3.body.user?.email);
}

async function testDonors() {
  section('Donors — Public Routes');

  // Public search (no token needed)
  const r1 = await request('GET', '/api/donors?city=Lahore');
  check('GET /donors (public) → 200', r1.status === 200, `got ${r1.status}`);
  check('GET /donors returns donors array', Array.isArray(r1.body.donors));

  // Public stats
  const r2 = await request('GET', '/api/donors/stats');
  check('GET /donors/stats (public) → 200', r2.status === 200, `got ${r2.status}`);
  check('GET /donors/stats returns stats object', !!r2.body.stats);

  if (r1.body.donors?.length > 0) {
    donorId = r1.body.donors[0].id;
    const r3 = await request('GET', `/api/donors/${donorId}`);
    check(`GET /donors/:id (public) → 200`, r3.status === 200, `got ${r3.status}`);
    check('GET /donors/:id returns donor', !!r3.body.donor);
  } else {
    log.push('  ⚠️  SKIP  No donors in DB — skipping GET /donors/:id test');
  }

  section('Donors — Protected Routes');

  // No token
  const r4 = await request('GET', '/api/donors/profile/me');
  check('GET /donors/profile/me no token → 401', r4.status === 401, `got ${r4.status}`);

  // With token
  const r5 = await request('GET', '/api/donors/profile/me', null, userToken);
  check('GET /donors/profile/me valid token → 200', r5.status === 200, `got ${r5.status}`);

  // Update availability — no token
  const r6 = await request('PUT', '/api/donors/availability', { availability: true });
  check('PUT /donors/availability no token → 401', r6.status === 401, `got ${r6.status}`);

  // Update availability — with token
  const r7 = await request('PUT', '/api/donors/availability', { availability: true }, userToken);
  check('PUT /donors/availability valid → 200', r7.status === 200, `got ${r7.status}`);

  // Update profile — no token
  const r8 = await request('PUT', '/api/donors/profile', { city: 'Karachi' });
  check('PUT /donors/profile no token → 401', r8.status === 401, `got ${r8.status}`);

  // Update profile — with token
  const r9 = await request('PUT', '/api/donors/profile', {
    first_name : 'Test',
    last_name  : 'User',
    phone      : '03001234567',
    city       : 'Lahore',
    blood_group: 'A+',
  }, userToken);
  check('PUT /donors/profile valid → 200', r9.status === 200, `got ${r9.status}`);
}

async function testRequests() {
  section('Blood Requests — Public Routes');

  const r1 = await request('GET', '/api/requests/active');
  check('GET /requests/active (public) → 200', r1.status === 200, `got ${r1.status}`);
  check('GET /requests/active returns array', Array.isArray(r1.body.requests));

  section('Blood Requests — Protected Routes');

  // Create without auth
  const r2 = await request('POST', '/api/requests', {
    patient_name: 'Ali Khan',
    blood_group : 'O+',
    city        : 'Lahore',
    phone       : '03001234567',
  });
  check('POST /requests no token → 401', r2.status === 401, `got ${r2.status}`);

  // Create with missing fields → 422
  const r3 = await request('POST', '/api/requests', { blood_group: 'O+' }, userToken);
  check('POST /requests missing fields → 422', r3.status === 422, `got ${r3.status}`);

  // Create valid request
  const r4 = await request('POST', '/api/requests', {
    patient_name: 'Test Patient',
    blood_group : 'O+',
    city        : 'Lahore',
    phone       : '03001234567',
    urgency     : 'normal',
  }, userToken);
  check('POST /requests valid → 201', r4.status === 201, `got ${r4.status}`);
  check('POST /requests returns request_id', !!r4.body.request_id);

  if (r4.body.request_id) requestId = r4.body.request_id;

  // Get my requests
  const r5 = await request('GET', '/api/requests/mine');
  check('GET /requests/mine no token → 401', r5.status === 401, `got ${r5.status}`);

  const r6 = await request('GET', '/api/requests/mine', null, userToken);
  check('GET /requests/mine valid → 200', r6.status === 200, `got ${r6.status}`);

  // Update status
  if (requestId) {
    const r7 = await request('PUT', `/api/requests/${requestId}/status`, { status: 'completed' });
    check('PUT /requests/:id/status no token → 401', r7.status === 401, `got ${r7.status}`);

    const r8 = await request('PUT', `/api/requests/${requestId}/status`, { status: 'completed' }, userToken);
    check('PUT /requests/:id/status valid → 200', r8.status === 200, `got ${r8.status}`);

    const r9 = await request('PUT', `/api/requests/${requestId}/status`, { status: 'INVALID' }, userToken);
    check('PUT /requests/:id/status invalid status → 422', r9.status === 422, `got ${r9.status}`);

    // Get request donors
    const r10 = await request('GET', `/api/requests/${requestId}/donors`);
    check('GET /requests/:id/donors no token → 401', r10.status === 401, `got ${r10.status}`);

    const r11 = await request('GET', `/api/requests/${requestId}/donors`, null, userToken);
    check('GET /requests/:id/donors valid → 200', r11.status === 200, `got ${r11.status}`);
  }
}

async function testRatings() {
  section('Ratings');

  // Public get ratings (needs a donorId)
  if (donorId) {
    const r1 = await request('GET', `/api/ratings/${donorId}`);
    check('GET /ratings/:donor_id (public) → 200', r1.status === 200, `got ${r1.status}`);
  } else {
    log.push('  ⚠️  SKIP  No donorId available — skipping GET /ratings/:id test');
  }

  // Submit rating — no token
  const r2 = await request('POST', '/api/ratings', { donor_id: donorId || 1, rating: 5 });
  check('POST /ratings no token → 401', r2.status === 401, `got ${r2.status}`);

  // Submit rating — with token (may fail if donor is self or request not found, that's ok)
  if (donorId && donorId !== userId) {
    const r3 = await request('POST', '/api/ratings', {
      donor_id  : donorId,
      request_id: requestId || 1,
      rating    : 5,
      feedback  : 'Great donor!',
    }, userToken);
    check('POST /ratings valid → 200 or 201', [200, 201].includes(r3.status), `got ${r3.status} — ${r3.body.message || ''}`);
  } else {
    log.push('  ⚠️  SKIP  No separate donorId — skipping POST /ratings test');
  }
}

async function testNotifications() {
  section('Notifications — all protected');

  // No token
  const r1 = await request('GET', '/api/notifications');
  check('GET /notifications no token → 401', r1.status === 401, `got ${r1.status}`);

  // With token
  const r2 = await request('GET', '/api/notifications', null, userToken);
  check('GET /notifications valid → 200', r2.status === 200, `got ${r2.status}`);
  check('GET /notifications returns array', Array.isArray(r2.body.notifications));

  if (r2.body.notifications?.length > 0) notifId = r2.body.notifications[0].id;

  // Mark all read — no token
  const r3 = await request('PUT', '/api/notifications/read-all');
  check('PUT /notifications/read-all no token → 401', r3.status === 401, `got ${r3.status}`);

  // Mark all read — with token
  const r4 = await request('PUT', '/api/notifications/read-all', null, userToken);
  check('PUT /notifications/read-all valid → 200', r4.status === 200, `got ${r4.status}`);

  if (notifId) {
    const r5 = await request('PUT', `/api/notifications/${notifId}/read`);
    check('PUT /notifications/:id/read no token → 401', r5.status === 401, `got ${r5.status}`);

    const r6 = await request('PUT', `/api/notifications/${notifId}/read`, null, userToken);
    check('PUT /notifications/:id/read valid → 200', r6.status === 200, `got ${r6.status}`);
  }
}

async function testAI() {
  section('AI Endpoints');

  // Chat — public (no token), should work
  const r1 = await request('POST', '/api/ai/chat', { message: 'Can O negative donate to anyone?' });
  check('POST /ai/chat (no token, public) → 200', r1.status === 200, `got ${r1.status}`);
  const chatLogId = r1.body.logId || null;

  // Chat — with token
  const r2 = await request('POST', '/api/ai/chat', { message: 'What is the age requirement?' }, userToken);
  check('POST /ai/chat (with token) → 200', r2.status === 200, `got ${r2.status}`);

  // Outreach — no token → 401
  // Controller expects { requestId } (the DB id of a blood_request row)
  const r3 = await request('POST', '/api/ai/generate-outreach', { requestId: requestId || 1 });
  check('POST /ai/generate-outreach no token → 401', r3.status === 401, `got ${r3.status}`);

  // Outreach — with token + valid requestId created in earlier test
  if (requestId) {
    const r4 = await request('POST', '/api/ai/generate-outreach', { requestId }, userToken);
    check('POST /ai/generate-outreach with token+requestId → 200', r4.status === 200, `got ${r4.status}`);
  } else {
    log.push('  ⚠️  SKIP  No requestId from earlier test — skipping generate-outreach');
  }

  // Feedback — expects { logId: <number>, feedback: -1|0|1 }
  // Uses a logId from the chat call above, feedback=1 means thumbs up
  if (chatLogId) {
    const r5 = await request('POST', '/api/ai/feedback', { logId: chatLogId, feedback: 1 });
    check('POST /ai/feedback (no token, public) → 200', r5.status === 200, `got ${r5.status}`);
  } else {
    // No logId available — test validation (missing fields → 400)
    const r5 = await request('POST', '/api/ai/feedback', {});
    check('POST /ai/feedback missing fields → 400', r5.status === 400, `got ${r5.status}`);
  }
}

async function testAdminProtection() {
  section('Admin Endpoints — protection checks (no admin token available)');

  // All admin routes should return 401 or 403 without a valid admin token
  const routes = [
    ['GET',    '/api/admin/stats'],
    ['GET',    '/api/admin/users'],
    ['GET',    '/api/admin/requests'],
  ];

  for (const [method, path] of routes) {
    // No token → 401
    const r1 = await request(method, path);
    check(`${method} ${path} no token → 401`, r1.status === 401, `got ${r1.status}`);

    // User token (non-admin) → 403
    const r2 = await request(method, path, null, userToken);
    check(`${method} ${path} user token → 403`, r2.status === 403, `got ${r2.status}`);
  }
}

async function test404() {
  section('404 Handler');
  const r = await request('GET', '/api/this-does-not-exist');
  check('GET unknown route → 404', r.status === 404, `got ${r.status}`);
}

// ── Validation Tests ──────────────────────────────────────────────────────────
async function testValidation() {
  section('Validation — Email format');
  const base = { first_name:'Ali', last_name:'Khan', password:'Test@1234', blood_group:'A+', city:'Lahore' };

  const r1 = await request('POST', '/api/auth/register', { ...base, email: 'not-an-email' });
  check('Invalid email → 422', r1.status === 422, `got ${r1.status}`);
  check('Invalid email → field=email', r1.body.field === 'email', `field=${r1.body.field}`);

  const r2 = await request('POST', '/api/auth/register', { ...base, email: 'noatsign.com' });
  check('Email without @ → 422', r2.status === 422, `got ${r2.status}`);

  section('Validation — Password strength');
  const base2 = { ...base, email: `v_pass_${Date.now()}@test.com` };

  const p1 = await request('POST', '/api/auth/register', { ...base2, password: '123' });
  check('Too short password (3 chars) → 422', p1.status === 422, `got ${p1.status}`);
  check('Too short password → field=password', p1.body.field === 'password', `field=${p1.body.field}`);

  const p2 = await request('POST', '/api/auth/register', { ...base2, password: 'allowercase1' });
  check('No uppercase → 422', p2.status === 422, `got ${p2.status}`);

  const p3 = await request('POST', '/api/auth/register', { ...base2, password: 'ALLUPPERCASE1' });
  check('No lowercase → 422', p3.status === 422, `got ${p3.status}`);

  const p4 = await request('POST', '/api/auth/register', { ...base2, password: 'NoNumbers!' });
  check('No digit → 422', p4.status === 422, `got ${p4.status}`);

  section('Validation — Phone number');
  const base3 = { ...base, email: `v_phone_${Date.now()}@test.com` };

  const ph1 = await request('POST', '/api/auth/register', { ...base3, password: 'Test@1234', phone: '123' });
  check('Too short phone → 422', ph1.status === 422, `got ${ph1.status}`);
  check('Too short phone → field=phone', ph1.body.field === 'phone', `field=${ph1.body.field}`);

  const ph2 = await request('POST', '/api/auth/register', { ...base3, password: 'Test@1234', phone: 'abcdefghij' });
  check('Non-numeric phone → 422', ph2.status === 422, `got ${ph2.status}`);

  const ph3 = await request('POST', '/api/auth/register', { ...base3, password: 'Test@1234', phone: '03001234567' });
  check('Valid Pakistani phone → 201', ph3.status === 201, `got ${ph3.status} — ${ph3.body.message || ''}`);

  section('Validation — Blood group');
  const base4 = { ...base, email: `v_bg_${Date.now()}@test.com`, password: 'Test@1234' };

  const bg1 = await request('POST', '/api/auth/register', { ...base4, blood_group: 'XYZ' });
  check('Invalid blood group XYZ → 422', bg1.status === 422, `got ${bg1.status}`);
  check('Invalid blood group → field=blood_group', bg1.body.field === 'blood_group', `field=${bg1.body.field}`);

  const bg2 = await request('POST', '/api/auth/register', { ...base4, blood_group: 'a+' });
  check('Lowercase blood group a+ → 201 (auto-uppercased)', bg2.status === 201, `got ${bg2.status}`);

  section('Validation — City name');
  const base5 = { ...base, email: `v_city_${Date.now()}@test.com`, password: 'Test@1234' };

  const c1 = await request('POST', '/api/auth/register', { ...base5, city: 'X' });
  check('City too short (1 char) → 422', c1.status === 422, `got ${c1.status}`);

  const c2 = await request('POST', '/api/auth/register', { ...base5, city: 'City123!!' });
  check('City with special chars/numbers → 422', c2.status === 422, `got ${c2.status}`);

  section('Validation — Rating range');
  const r_bad1 = await request('POST', '/api/ratings', { donor_id: 1, rating: 6 }, userToken);
  check('Rating > 5 → 422', r_bad1.status === 422, `got ${r_bad1.status}`);

  const r_bad2 = await request('POST', '/api/ratings', { donor_id: 1, rating: 0 }, userToken);
  check('Rating = 0 → 422', r_bad2.status === 422, `got ${r_bad2.status}`);

  const r_bad3 = await request('POST', '/api/ratings', { donor_id: 1, rating: 'five' }, userToken);
  check('Rating non-numeric → 422', r_bad3.status === 422, `got ${r_bad3.status}`);

  section('Validation — Urgency');
  const u1 = await request('POST', '/api/requests', {
    patient_name: 'Test Patient',
    blood_group : 'O+',
    city        : 'Lahore',
    phone       : '03001234567',
    urgency     : 'SUPER_URGENT',
  }, userToken);
  check('Invalid urgency → 422', u1.status === 422, `got ${u1.status}`);
  check('Invalid urgency → field=urgency', u1.body.field === 'urgency', `field=${u1.body.field}`);

  section('Validation — Coordinates');
  const coord1 = await request('PUT', '/api/donors/availability', { availability: true, latitude: 999, longitude: 74 }, userToken);
  check('Latitude > 90 → 422', coord1.status === 422, `got ${coord1.status}`);
  check('Latitude > 90 → field=latitude', coord1.body.field === 'latitude', `field=${coord1.body.field}`);

  const coord2 = await request('PUT', '/api/donors/availability', { availability: true, latitude: 31, longitude: -999 }, userToken);
  check('Longitude < -180 → 422', coord2.status === 422, `got ${coord2.status}`);
  check('Longitude < -180 → field=longitude', coord2.body.field === 'longitude', `field=${coord2.body.field}`);

  section('Validation — AI fields');
  const ai1 = await request('POST', '/api/ai/chat', { message: 'hi' });
  check('AI chat message too short → 422', ai1.status === 422, `got ${ai1.status}`);

  const ai2 = await request('POST', '/api/ai/chat', {});
  check('AI chat empty message → 422', ai2.status === 422, `got ${ai2.status}`);

  const ai3 = await request('POST', '/api/ai/feedback', { logId: 'abc', feedback: 1 });
  check('AI feedback non-numeric logId → 422', ai3.status === 422, `got ${ai3.status}`);

  const ai4 = await request('POST', '/api/ai/feedback', { logId: 1, feedback: 99 });
  check('AI feedback invalid value 99 → 422', ai4.status === 422, `got ${ai4.status}`);
}

// ── Main Runner ───────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🩸  BloodConnect API Test Suite');
  console.log('================================\n');

  try {
    await testHealth();
    await testAuthRegister();
    await testAuthLogin();
    await testAuthMe();
    await testDonors();
    await testRequests();
    await testRatings();
    await testNotifications();
    await testAI();
    await testAdminProtection();
    await test404();
    await testValidation();     // ← NEW: comprehensive validation tests
  } catch (err) {
    console.error('Unexpected runner error:', err);
  }

  console.log(log.join('\n'));

  const total   = passed + failed;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  console.log('\n================================');
  console.log(`Total : ${total}`);
  console.log(`Passed: ${passed}  ✅`);
  console.log(`Failed: ${failed}  ❌`);
  console.log(`Rate  : ${passRate}%`);
  console.log('================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
