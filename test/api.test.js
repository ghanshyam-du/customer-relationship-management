const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const { initializeDatabase } = require('../src/db/initDb');

let server;
let baseUrl;

async function runTests() {
  console.log('\n--- Starting CRM Backend Integration Tests ---\n');

  try {
    // 1. Initialize schema and start ephemeral test server
    await initializeDatabase();
    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        console.log(`[SETUP] Test server running on ${baseUrl}`);
        resolve();
      });
    });

    let passedCount = 0;
    let failedCount = 0;

    async function assertTest(description, fn) {
      try {
        await fn();
        console.log(`  PASS: ${description}`);
        passedCount++;
      } catch (err) {
        console.error(`  FAIL: ${description}`);
        console.error(`        Error: ${err.message}`);
        failedCount++;
      }
    }

    let counselor1Token = '';
    let counselor2Token = '';
    let testEnquiryId = null;

    // Test 1: Health check
    await assertTest('GET /health returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      if (res.status !== 200 || !body.success) {
        throw new Error(`Expected 200, got ${res.status}`);
      }
    });

    // Test 2: Counselor 1 Login
    await assertTest('POST /auth/login logs in existing counselor and returns JWT', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'john.counselor@company.com',
          password: 'password123',
        }),
      });
      const body = await res.json();
      if (res.status !== 200 || !body.data.token) {
        throw new Error(`Login failed with status ${res.status}: ${body.message}`);
      }
      counselor1Token = body.data.token;
    });

    // Test 3: Counselor 2 Login
    await assertTest('POST /auth/login logs in second counselor', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sarah.counselor@company.com',
          password: 'password123',
        }),
      });
      const body = await res.json();
      if (res.status !== 200 || !body.data.token) {
        throw new Error(`Login failed with status ${res.status}: ${body.message}`);
      }
      counselor2Token = body.data.token;
    });

    // Test 4: Counselor Registration
    await assertTest('POST /auth/register creates a new employee account', async () => {
      const uniqueEmail = `test.counselor.${Date.now()}@company.com`;
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Counselor',
          email: uniqueEmail,
          password: 'testPassword123',
          phone: '+1-555-9999',
        }),
      });
      const body = await res.json();
      if (res.status !== 201 || !body.data.token) {
        throw new Error(`Register failed with status ${res.status}: ${body.message}`);
      }
    });

    // Test 5: Public Enquiry Form (No Auth Required)
    await assertTest('POST /enquiries/public creates lead without authentication', async () => {
      const res = await fetch(`${baseUrl}/enquiries/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Prospect',
          email: 'jane.prospect@example.com',
          phone: '+1-555-8888',
          courseInterest: 'Full Stack Web Development (MERN)',
          notes: 'Wants to join weekend cohort',
        }),
      });
      const body = await res.json();
      if (res.status !== 201 || !body.data.enquiry.id) {
        throw new Error(`Public enquiry failed with status ${res.status}: ${body.message}`);
      }
      testEnquiryId = body.data.enquiry.id;
    });

    // Test 6: Protected route rejected without JWT
    await assertTest('GET /enquiries/unclaimed fails with 401 when no token is passed', async () => {
      const res = await fetch(`${baseUrl}/enquiries/unclaimed`);
      if (res.status !== 401) {
        throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
      }
    });

    // Test 7: Fetch unclaimed leads inside CRM
    await assertTest('GET /enquiries/unclaimed returns list including newly created lead', async () => {
      const res = await fetch(`${baseUrl}/enquiries/unclaimed`, {
        headers: { Authorization: `Bearer ${counselor1Token}` },
      });
      const body = await res.json();
      if (res.status !== 200 || !Array.isArray(body.data.enquiries)) {
        throw new Error(`Expected array of enquiries, got status ${res.status}`);
      }
      const found = body.data.enquiries.some((e) => e.id === testEnquiryId);
      if (!found) {
        throw new Error(`Newly created enquiry ${testEnquiryId} not found in unclaimed list`);
      }
    });

    // Test 8: Counselor 1 Claims Lead
    await assertTest('POST /enquiries/:id/claim successfully assigns lead to Counselor 1', async () => {
      const res = await fetch(`${baseUrl}/enquiries/${testEnquiryId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${counselor1Token}` },
      });
      const body = await res.json();
      if (res.status !== 200 || body.data.enquiry.status !== 'CLAIMED') {
        throw new Error(`Claim failed with status ${res.status}: ${body.message}`);
      }
    });

    // Test 9: Lead is no longer in public unclaimed list
    await assertTest('GET /enquiries/unclaimed no longer contains the claimed lead', async () => {
      const res = await fetch(`${baseUrl}/enquiries/unclaimed`, {
        headers: { Authorization: `Bearer ${counselor2Token}` },
      });
      const body = await res.json();
      const found = body.data.enquiries.some((e) => e.id === testEnquiryId);
      if (found) {
        throw new Error(`Claimed lead ${testEnquiryId} is still visible in unclaimed list!`);
      }
    });

    // Test 10: Counselor 2 attempts to claim already claimed lead -> 409 Conflict
    await assertTest('POST /enquiries/:id/claim by Counselor 2 returns 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/enquiries/${testEnquiryId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${counselor2Token}` },
      });
      const body = await res.json();
      if (res.status !== 409) {
        throw new Error(`Expected 409 Conflict, got ${res.status}: ${body.message}`);
      }
    });

    // Test 11: Counselor 1 fetches their claimed leads
    await assertTest('GET /enquiries/my-claims for Counselor 1 contains the claimed lead', async () => {
      const res = await fetch(`${baseUrl}/enquiries/my-claims`, {
        headers: { Authorization: `Bearer ${counselor1Token}` },
      });
      const body = await res.json();
      const found = body.data.enquiries.some((e) => e.id === testEnquiryId);
      if (!found) {
        throw new Error(`Claimed lead ${testEnquiryId} not present in Counselor 1 claims list`);
      }
    });

    // Test 12: Counselor 2 fetches their claimed leads -> must NOT contain Counselor 1 lead
    await assertTest('GET /enquiries/my-claims for Counselor 2 does NOT contain Counselor 1 lead', async () => {
      const res = await fetch(`${baseUrl}/enquiries/my-claims`, {
        headers: { Authorization: `Bearer ${counselor2Token}` },
      });
      const body = await res.json();
      const found = body.data.enquiries.some((e) => e.id === testEnquiryId);
      if (found) {
        throw new Error(`Privacy breach: Counselor 2 can see Counselor 1 claimed lead!`);
      }
    });

    // Test 13: Counselor 1 updates lead status and follow-up notes
    await assertTest('PATCH /enquiries/:id/status updates lead status and notes', async () => {
      const res = await fetch(`${baseUrl}/enquiries/${testEnquiryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${counselor1Token}`,
        },
        body: JSON.stringify({
          status: 'CONTACTED',
          notes: 'Called prospective student. Demo session scheduled for tomorrow.',
        }),
      });
      const body = await res.json();
      if (res.status !== 200 || body.data.enquiry.status !== 'CONTACTED') {
        throw new Error(`Status update failed: ${body.message}`);
      }
    });

    console.log(`\n--- Test Results: ${passedCount} passed, ${failedCount} failed ---\n`);

    if (failedCount > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
  }
}

runTests();
