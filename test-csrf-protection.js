const http = require('http');
const querystring = require('querystring');

/**
 * CSRF Token Test Script
 * Chứng minh CSRF protection hoạt động
 */

const BASE_URL = 'http://localhost:3000';
let sessionCookie = null;
let csrfToken = null;

// Màu cho console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('\n' + '='.repeat(70));
  log(`🧪 TEST: ${testName}`, 'cyan');
  console.log('='.repeat(70));
}

function logResult(passed, message) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${message}`, color);
}

/**
 * Step 1: Get CSRF token từ trang login
 */
async function step1_GetCSRFToken() {
  logTest('Step 1: Lấy CSRF Token từ trang Login');

  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}/login`, (res) => {
      let data = '';
      
      // Lưu session cookie
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        sessionCookie = setCookie[0].split(';')[0];
        log(`✓ Session Cookie: ${sessionCookie}`, 'green');
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Extract CSRF token từ HTML
        const match = data.match(/name="_csrf"\s+value="([^"]+)"/);
        if (match) {
          csrfToken = match[1];
          logResult(true, `CSRF Token lấy thành công: ${csrfToken.substring(0, 20)}...`);
          resolve();
        } else {
          logResult(false, 'Không tìm thấy CSRF token trong HTML');
          reject(new Error('CSRF token not found'));
        }
      });
    });

    req.on('error', reject);
  });
}

/**
 * Step 2: Test Login WITH valid CSRF token
 */
async function step2_LoginWithValidToken() {
  logTest('Step 2: Test Login VỚI CSRF Token Hợp Lệ');

  log(`📝 Request Data:`, 'blue');
  log(`  - Username: testuser`, 'blue');
  log(`  - Password: wrongpass (test sai password)`, 'blue');
  log(`  - _csrf: ${csrfToken.substring(0, 20)}...`, 'blue');
  log(`  - Cookie: ${sessionCookie}`, 'blue');

  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      username: 'testuser',
      password: 'wrongpass123',
      _csrf: csrfToken,
      redirect: '/profile'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': sessionCookie
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        log(`\n📊 Response Status: ${res.statusCode}`, 'blue');
        
        if (res.statusCode === 200 || res.statusCode === 401) {
          logResult(true, `✓ Request được accept (status ${res.statusCode})`);
          logResult(true, `✓ CSRF Token validation PASSED`);
          resolve();
        } else if (res.statusCode === 403) {
          logResult(false, `✗ Request bị reject CSRF (status 403)`);
          reject(new Error('CSRF validation failed'));
        } else {
          logResult(false, `✗ Unexpected status ${res.statusCode}`);
          reject(new Error(`Unexpected status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Step 3: Test Login WITHOUT CSRF token
 */
async function step3_LoginWithoutToken() {
  logTest('Step 3: Test Login KHÔNG CÓ CSRF Token');

  log(`📝 Request Data:`, 'blue');
  log(`  - Username: testuser`, 'blue');
  log(`  - Password: wrongpass`, 'blue');
  log(`  - _csrf: (MISSING!) ❌`, 'red');
  log(`  - Cookie: ${sessionCookie}`, 'blue');

  return new Promise((resolve, reject) => {
    // Không có _csrf field
    const postData = querystring.stringify({
      username: 'testuser',
      password: 'wrongpass123',
      redirect: '/profile'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': sessionCookie
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        log(`\n📊 Response Status: ${res.statusCode}`, 'blue');

        if (res.statusCode === 403) {
          logResult(true, `✓ Request bị REJECT (status 403) - CSRF Protection WORKS!`);
          resolve();
        } else if (res.statusCode === 200 || res.statusCode === 401) {
          logResult(false, `✗ Request được accept - CSRF Protection FAILED!`);
          reject(new Error('CSRF protection not working'));
        } else {
          log(`⚠️ Status: ${res.statusCode}`, 'yellow');
          resolve();
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Step 4: Test Login WITH INVALID CSRF token
 */
async function step4_LoginWithInvalidToken() {
  logTest('Step 4: Test Login VỚI CSRF Token SAI');

  const fakeToken = 'invalid_token_abc123def456';

  log(`📝 Request Data:`, 'blue');
  log(`  - Username: testuser`, 'blue');
  log(`  - Password: wrongpass`, 'blue');
  log(`  - _csrf: ${fakeToken} (INVALID!)`, 'red');
  log(`  - Cookie: ${sessionCookie}`, 'blue');

  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      username: 'testuser',
      password: 'wrongpass123',
      _csrf: fakeToken,
      redirect: '/profile'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': sessionCookie
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        log(`\n📊 Response Status: ${res.statusCode}`, 'blue');

        if (res.statusCode === 403) {
          logResult(true, `✓ Request bị REJECT (status 403) - Invalid token rejected!`);
          resolve();
        } else if (res.statusCode === 200 || res.statusCode === 401) {
          logResult(false, `✗ Request được accept - Should reject invalid token!`);
          reject(new Error('Invalid CSRF token not rejected'));
        } else {
          log(`⚠️ Status: ${res.statusCode}`, 'yellow');
          resolve();
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Step 5: Test CSRF Attack Simulation
 */
async function step5_CSRFAttackSimulation() {
  logTest('Step 5: Mô Phỏng CSRF Attack (Attacker không có CSRF token)');

  log(`\n🎯 Scenario: Attacker tạo form tự động submit`, 'yellow');
  log(`\n📝 Attacker HTML code:`, 'blue');
  log(`
<form action="http://localhost:3000/login" method="POST">
  <input name="username" value="attacker">
  <input name="password" value="attacker_pass">
  <input name="to_transfer" value="1000">
  <!-- CSRF token SAI HOẶC KHÔNG CÓ! -->
</form>
<script>document.forms[0].submit();</script>
  `, 'blue');

  log(`\n🔍 Attack Attempt: Gửi form từ attacker site...`, 'yellow');

  return new Promise((resolve, reject) => {
    // Simulate attacker sending form without token
    const postData = querystring.stringify({
      username: 'admin',
      password: 'admin_password',
      action: 'transfer_money',
      to: 'attacker_account',
      amount: '1000000'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': sessionCookie,
        'Referer': 'http://attacker.com/malicious.html'  // Simulate cross-origin
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        log(`\n📊 Response Status: ${res.statusCode}`, 'blue');

        if (res.statusCode === 403) {
          logResult(true, `✓ Attack BLOCKED! (status 403)`);
          logResult(true, `✓ CSRF Protection Prevents Unauthorized Actions!`);
          resolve();
        } else if (res.statusCode === 200) {
          logResult(false, `✗ Attack SUCCEEDED - CSRF Protection FAILED!`);
          reject(new Error('CSRF attack not prevented'));
        } else {
          log(`Status: ${res.statusCode}`, 'yellow');
          resolve();
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Test Register Form CSRF Token
 */
async function step6_RegisterCSRFToken() {
  logTest('Step 6: Kiểm tra Register Form CSRF Token');

  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}/register`, (res) => {
      let data = '';

      const setCookie = res.headers['set-cookie'];
      const registerSessionCookie = setCookie ? setCookie[0].split(';')[0] : null;

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/name="_csrf"\s+value="([^"]+)"/);
        if (match) {
          const registerToken = match[1];
          logResult(true, `Register form có CSRF token: ${registerToken.substring(0, 20)}...`);
          log(`✓ Register endpoint cũng được bảo vệ`, 'green');
          resolve();
        } else {
          logResult(false, 'Register form KHÔNG có CSRF token!');
          reject(new Error('CSRF token missing in register form'));
        }
      });
    });

    req.on('error', reject);
  });
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.clear();
  log(`
╔════════════════════════════════════════════════════════════════════╗
║           CSRF Token Protection Test Suite                         ║
║                                                                    ║
║ Chứng minh CSRF protection hoạt động bằng cách:                  ║
║ 1. Lấy CSRF token từ login form                                   ║
║ 2. Test login với token hợp lệ → Thành công                      ║
║ 3. Test login KHÔNG có token → Bị reject (403)                   ║
║ 4. Test login với token sai → Bị reject (403)                    ║
║ 5. Mô phỏng CSRF attack → Bị block                                ║
║ 6. Kiểm tra register form cũng có token                           ║
╚════════════════════════════════════════════════════════════════════╝
  `, 'cyan');

  const tests = [
    { name: 'Step 1', fn: step1_GetCSRFToken },
    { name: 'Step 2', fn: step2_LoginWithValidToken },
    { name: 'Step 3', fn: step3_LoginWithoutToken },
    { name: 'Step 4', fn: step4_LoginWithInvalidToken },
    { name: 'Step 5', fn: step5_CSRFAttackSimulation },
    { name: 'Step 6', fn: step6_RegisterCSRFToken }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      failed++;
      log(`\n❌ ${test.name} failed: ${error.message}`, 'red');
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  log('📊 TEST SUMMARY', 'cyan');
  console.log('='.repeat(70));
  log(`✅ Passed: ${passed}/${tests.length}`, 'green');
  if (failed > 0) {
    log(`❌ Failed: ${failed}/${tests.length}`, 'red');
  }
  console.log('='.repeat(70));

  if (failed === 0) {
    log(`\n🎉 All tests passed! CSRF protection is working correctly!\n`, 'green');
  } else {
    log(`\n⚠️ Some tests failed. CSRF protection may have issues.\n`, 'yellow');
  }
}

// Run tests
runAllTests()
  .catch(error => {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
