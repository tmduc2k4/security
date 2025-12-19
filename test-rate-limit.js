/**
 * TEST: Rate Limiting on /login endpoint
 * Rate Limit Config: Max 5 requests per 15 minutes
 * 
 * Mục đích: Test xem rate limiting có chặn requests sau lần thứ 5
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Local server
const LOGIN_URL = `${BASE_URL}/login`;

console.log('🔍 RATE LIMIT TEST');
console.log('========================================');
console.log(`Target: ${LOGIN_URL}`);
console.log(`Config: Max 5 requests / 15 minutes`);
console.log(`Test: Gửi 10 requests liên tiếp`);
console.log('========================================\n');

/**
 * Test Rate Limiting
 */
async function testRateLimit() {
  const results = {
    allowed: 0,
    blocked: 0,
    errors: 0,
    responses: []
  };

  for (let i = 1; i <= 10; i++) {
    try {
      const response = await axios.post(LOGIN_URL, {
        username: 'testuser',
        password: 'wrongpassword'
      }, {
        validateStatus: () => true, // Don't throw on any status
        timeout: 5000
      });

      const status = response.status;
      const timestamp = new Date().toLocaleTimeString('vi-VN');

      console.log(`[${timestamp}] Request ${i}:`);

      if (status === 429) {
        console.log(`   ✋ BLOCKED (429 Too Many Requests)`);
        console.log(`   Message: ${response.data?.message || response.data?.error || 'Rate limit exceeded'}`);
        console.log(`   Headers: ${JSON.stringify(response.headers['retry-after'] ? { 'Retry-After': response.headers['retry-after'] } : {})}`);
        results.blocked++;
      } else if (status === 400 || status === 401 || status === 403 || status === 422) {
        console.log(`   ✅ ALLOWED (${status})`);
        console.log(`   Message: ${response.data?.error || response.data?.message || 'Invalid credentials'}`);
        results.allowed++;
      } else {
        console.log(`   ℹ️  Response ${status}`);
        results.allowed++;
      }

      results.responses.push({
        attempt: i,
        status: status,
        timestamp: timestamp
      });

      console.log('');

      // Delay 200ms giữa requests
      await sleep(200);

    } catch (error) {
      console.log(`[Request ${i}] ❌ ERROR: ${error.message}`);
      results.errors++;
      console.log('');
    }
  }

  // Summary
  displaySummary(results);
}

/**
 * Display Summary
 */
function displaySummary(results) {
  console.log('========================================');
  console.log('📊 RATE LIMIT TEST SUMMARY');
  console.log('========================================');
  console.log(`✅ Allowed Requests:  ${results.allowed}`);
  console.log(`✋ Blocked Requests:  ${results.blocked}`);
  console.log(`❌ Errors:           ${results.errors}`);
  console.log('');

  if (results.blocked > 0) {
    console.log('✅ RATE LIMITING WORKS!');
    console.log(`   After ${results.allowed} allowed requests,`);
    console.log(`   ${results.blocked} requests were blocked with HTTP 429`);
  } else {
    console.log('⚠️  NO RATE LIMITING DETECTED');
    console.log(`   All ${results.allowed} requests were allowed`);
    console.log('   Make sure the server is running on ' + BASE_URL);
  }

  console.log('');
  console.log('Response Timeline:');
  console.log('───────────────────');
  results.responses.forEach((r) => {
    const blocked = r.status === 429 ? '✋' : '✅';
    console.log(`${blocked} Req #${r.attempt}: ${r.status} at ${r.timestamp}`);
  });

  console.log('========================================\n');
}

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main
 */
(async () => {
  try {
    await testRateLimit();
  } catch (error) {
    console.error('Fatal error:', error.message);
  }
})();
