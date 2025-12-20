const http = require('http');

/**
 * Simple Rate Limit Test
 * Tests rate limiting on /login endpoint
 */

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

/**
 * Make a GET request to /login to get initial response
 */
async function makeRequest(attemptNum) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = http.get(`${BASE_URL}/login`, (res) => {
      const time = Date.now() - startTime;
      const status = res.statusCode;
      
      res.on('data', () => {});
      res.on('end', () => {
        resolve({ attempt: attemptNum, status, time });
      });
    });

    req.on('error', (err) => {
      const time = Date.now() - startTime;
      reject({ attempt: attemptNum, error: err.message, time });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject({ attempt: attemptNum, error: 'timeout', time: Date.now() - startTime });
    });
  });
}

/**
 * Main test
 */
async function runTest() {
  console.clear();
  log(`
╔════════════════════════════════════════════════════════════╗
║           Simple Rate Limit Test                          ║
║    Testing strict rate limiter on /login (5 req/15min)   ║
╚════════════════════════════════════════════════════════════╝
  `, 'cyan');

  const requests = 15;
  const results = [];
  let blocked = 0;
  let allowed = 0;
  let errors = 0;

  log(`\n📊 Making ${requests} requests to GET /login...`, 'blue');
  log(`⏱️  Rate limit: 5 requests per 15 minutes\n`, 'blue');

  for (let i = 1; i <= requests; i++) {
    try {
      const result = await makeRequest(i);
      results.push(result);

      if (result.status === 429) {
        log(`❌ [${result.time}ms] Attempt #${i}: BLOCKED (429 Too Many Requests)`, 'red');
        blocked++;
      } else {
        log(`✅ [${result.time}ms] Attempt #${i}: Allowed (${result.status})`, 'green');
        allowed++;
      }

      // Small delay between requests
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      log(`⚠️  [${err.time}ms] Attempt #${i}: Error - ${err.error}`, 'yellow');
      errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(62));
  log('📊 TEST SUMMARY', 'cyan');
  console.log('='.repeat(62));
  log(`Total requests: ${requests}`, 'blue');
  log(`✅ Allowed: ${allowed}`, allowed <= 5 ? 'green' : 'red');
  log(`❌ Blocked: ${blocked}`, blocked >= 10 ? 'green' : 'red');
  log(`⚠️  Errors: ${errors}`, 'yellow');

  console.log('\n' + '='.repeat(62));
  
  if (blocked > 0 && allowed <= 5) {
    log(`✅ RATE LIMITING WORKING!`, 'green');
    log(`   - Allowed ${allowed} requests (up to 5)`, 'green');
    log(`   - Blocked ${blocked} requests (429)`, 'green');
    log(`   - First request blocked at attempt #${results.find(r => r.status === 429).attempt}`, 'green');
  } else if (errors > 0) {
    log(`⚠️  Connection errors - is server running?`, 'yellow');
  } else {
    log(`❌ RATE LIMITING NOT WORKING!`, 'red');
    log(`   - All ${allowed} requests allowed`, 'red');
    log(`   - Should block after 5 requests`, 'red');
  }

  console.log('='.repeat(62) + '\n');
}

runTest().catch(err => {
  log(`\n❌ Test error: ${err.message}`, 'red');
  process.exit(1);
});
