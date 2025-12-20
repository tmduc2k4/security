const http = require('http');

/**
 * Rate Limit Test with IP Verification
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
 * Make a GET request with explicit headers
 */
async function makeRequest(attemptNum) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/login',
      method: 'GET',
      headers: {
        'User-Agent': 'Rate-Limit-Tester/1.0',
        'X-Forwarded-For': '127.0.0.1' // Explicit IP
      }
    };

    const req = http.request(options, (res) => {
      const time = Date.now() - startTime;
      const status = res.statusCode;
      const rateLimit = res.headers['x-ratelimit-limit'];
      const remaining = res.headers['x-ratelimit-remaining'];
      const reset = res.headers['x-ratelimit-reset'];
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          attempt: attemptNum, 
          status, 
          time,
          rateLimit,
          remaining,
          reset
        });
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

    req.end();
  });
}

/**
 * Main test
 */
async function runTest() {
  console.clear();
  log(`
╔════════════════════════════════════════════════════════════╗
║      Rate Limit Test with Headers Inspection               ║
║    Testing strict rate limiter on /login (5 req/15min)   ║
╚════════════════════════════════════════════════════════════╝
  `, 'cyan');

  const requests = 12;
  const results = [];
  let blocked = 0;
  let allowed = 0;
  let errors = 0;

  log(`\n📊 Making ${requests} rapid requests to GET /login...`, 'blue');
  log(`⏱️  Rate limit: 5 requests per 15 minutes`, 'blue');
  log(`🔍 Watching X-RateLimit headers\n`, 'blue');

  for (let i = 1; i <= requests; i++) {
    try {
      const result = await makeRequest(i);
      results.push(result);

      const remaining = result.remaining !== undefined ? ` (${result.remaining} remaining)` : '';
      
      if (result.status === 429) {
        log(`❌ [${result.time}ms] Attempt #${i}: BLOCKED - 429 Too Many Requests${remaining}`, 'red');
        blocked++;
      } else if (result.status === 200) {
        log(`✅ [${result.time}ms] Attempt #${i}: Allowed - 200 OK${remaining}`, 'green');
        allowed++;
      } else {
        log(`⚠️  [${result.time}ms] Attempt #${i}: Status ${result.status}${remaining}`, 'yellow');
        allowed++;
      }

      // NO delay - test rapid fire
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
  log(`✅ Allowed: ${allowed}`, 'blue');
  log(`❌ Blocked: ${blocked}`, blocked > 0 ? 'red' : 'blue');
  log(`⚠️  Errors: ${errors}`, 'yellow');

  console.log('\n' + '='.repeat(62));
  
  if (blocked > 0 && allowed <= 5) {
    log(`✅ RATE LIMITING WORKING!`, 'green');
    log(`   ✓ Allowed up to 5 requests`, 'green');
    log(`   ✓ Blocked requests with 429 status`, 'green');
    const firstBlocked = results.find(r => r.status === 429);
    if (firstBlocked) {
      log(`   ✓ First block at attempt #${firstBlocked.attempt}`, 'green');
    }
  } else if (errors > 0) {
    log(`⚠️  CONNECTION ERRORS - check if server is running`, 'yellow');
    log(`   Make sure to run: npm run dev`, 'yellow');
  } else {
    log(`❌ RATE LIMITING NOT WORKING!`, 'red');
    log(`   ✗ All ${allowed} requests were allowed`, 'red');
    log(`   ✗ Should have blocked requests after 5`, 'red');
    log(`\n   Debugging info:`, 'yellow');
    if (results.length > 0) {
      const firstResult = results[0];
      log(`   - X-RateLimit-Limit: ${firstResult.rateLimit || 'not sent'}`, 'yellow');
      log(`   - X-RateLimit-Remaining: ${firstResult.remaining || 'not sent'}`, 'yellow');
      log(`   - X-RateLimit-Reset: ${firstResult.reset || 'not sent'}`, 'yellow');
    }
  }

  console.log('='.repeat(62) + '\n');
}

runTest().catch(err => {
  log(`\n❌ Test error: ${err.message}`, 'red');
  process.exit(1);
});
