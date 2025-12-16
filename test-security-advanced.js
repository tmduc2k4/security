#!/usr/bin/env node
/**
 * Security Testing Script
 * Test SQL Injection, XSS, DDoS Protection
 * 
 * Usage: node test-security-advanced.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'https://tmd1907.id.vn/';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Make HTTP Request
function makeRequest(path, method = 'GET', data = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Security-Test-Script',
        ...customHeaders
      },
      rejectUnauthorized: false // Allow self-signed certificates
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// ==================== SQL INJECTION TESTS ====================

async function testSQLInjection() {
  log(colors.magenta, '\n========== SQL INJECTION TESTS ==========\n');

  const sqlInjectionPayloads = [
    {
      name: 'Classic SQL Injection - OR 1=1',
      payload: "' OR '1'='1",
      test: async () => {
        return makeRequest(`/?username=' OR '1'='1&password=test`);
      }
    },
    {
      name: 'SQL Injection - UNION SELECT',
      payload: "' UNION SELECT * FROM users --",
      test: async () => {
        return makeRequest(`/?search=' UNION SELECT * FROM users --`);
      }
    },
    {
      name: 'SQL Injection - DROP TABLE',
      payload: "'; DROP TABLE users; --",
      test: async () => {
        return makeRequest(`/?id=1'; DROP TABLE users; --`);
      }
    },
    {
      name: 'SQL Injection - INSERT Attack',
      payload: "'; INSERT INTO users VALUES ('hacker', 'pass'); --",
      test: async () => {
        return makeRequest(`/?username='; INSERT INTO users VALUES ('hacker', 'pass'); --`);
      }
    },
    {
      name: 'SQL Injection - EXEC Command',
      payload: "'; EXEC xp_cmdshell 'dir'; --",
      test: async () => {
        return makeRequest(`/?cmd='; EXEC xp_cmdshell 'dir'; --`);
      }
    }
  ];

  for (const test of sqlInjectionPayloads) {
    try {
      log(colors.blue, `\nTest: ${test.name}`);
      log(colors.yellow, `Payload: ${test.payload}`);

      const response = await test.test();

      if (response.statusCode === 403) {
        log(colors.green, `✓ BLOCKED - Status: ${response.statusCode}`);
        log(colors.green, '✓ SQL Injection protection ACTIVE');
      } else if (response.statusCode === 200) {
        log(colors.red, `⚠ WARNING - Request passed (Status: ${response.statusCode})`);
        log(colors.red, '⚠ SQL Injection might not be blocked properly');
      } else {
        log(colors.yellow, `? Unknown response (Status: ${response.statusCode})`);
      }
    } catch (error) {
      log(colors.red, `✗ Error: ${error.message}`);
    }
  }
}

// ==================== XSS TESTS ====================

async function testXSS() {
  log(colors.magenta, '\n========== XSS (Cross-Site Scripting) TESTS ==========\n');

  const xssPayloads = [
    {
      name: 'Basic Script Injection',
      payload: '<script>alert("XSS")</script>',
      test: async () => {
        return makeRequest('/register', 'POST', {
          username: '<script>alert("XSS")</script>',
          email: 'test@test.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
      }
    },
    {
      name: 'Event Handler XSS',
      payload: '<img src=x onerror="alert(\'XSS\')">',
      test: async () => {
        return makeRequest('/register', 'POST', {
          username: '<img src=x onerror="alert(\'XSS\')">',
          email: 'test@test.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
      }
    },
    {
      name: 'SVG XSS Attack',
      payload: '<svg onload="alert(\'XSS\')">',
      test: async () => {
        return makeRequest('/?search=<svg onload="alert(\'XSS\')">');
      }
    },
    {
      name: 'HTML Tag Injection',
      payload: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      test: async () => {
        return makeRequest('/?data=<iframe src="javascript:alert(\'XSS\')"></iframe>');
      }
    },
    {
      name: 'JavaScript Protocol',
      payload: '<a href="javascript:alert(\'XSS\')">Click</a>',
      test: async () => {
        return makeRequest('/?link=<a href="javascript:alert(\'XSS\')">Click</a>');
      }
    }
  ];

  for (const test of xssPayloads) {
    try {
      log(colors.blue, `\nTest: ${test.name}`);
      log(colors.yellow, `Payload: ${test.payload}`);

      const response = await test.test();

      // Check if response contains dangerous content
      const hasDangerousContent = 
        response.body.includes('<script>') ||
        response.body.includes('onerror=') ||
        response.body.includes('onload=') ||
        response.body.includes('javascript:');

      if (!hasDangerousContent && response.statusCode !== 400) {
        log(colors.green, `✓ SANITIZED - Dangerous content removed`);
        log(colors.green, '✓ XSS protection ACTIVE');
      } else if (hasDangerousContent) {
        log(colors.red, `⚠ WARNING - Dangerous content detected in response`);
        log(colors.red, '⚠ XSS protection might not be working');
      } else if (response.statusCode === 400) {
        log(colors.green, `✓ BLOCKED - Status: ${response.statusCode}`);
        log(colors.green, '✓ XSS protection ACTIVE');
      }
    } catch (error) {
      log(colors.red, `✗ Error: ${error.message}`);
    }
  }
}

// ==================== DDoS & RATE LIMITING TESTS ====================

async function testDDoS() {
  log(colors.magenta, '\n========== DDoS & RATE LIMITING TESTS ==========\n');

  log(colors.blue, 'Testing Rate Limiting - Sending 120 requests in rapid succession...\n');

  const requests = [];
  const maxRequests = 120;
  let blockedCount = 0;
  let successCount = 0;
  const startTime = Date.now();

  // Send rapid requests
  for (let i = 1; i <= maxRequests; i++) {
    const promise = makeRequest('/')
      .then(response => {
        if (response.statusCode === 429) {
          blockedCount++;
          return { blocked: true, status: 429 };
        } else if (response.statusCode === 200) {
          successCount++;
          return { blocked: false, status: 200 };
        } else {
          return { blocked: false, status: response.statusCode };
        }
      })
      .catch(error => {
        return { error: error.message };
      });

    requests.push(promise);

    // Print progress every 20 requests
    if (i % 20 === 0) {
      log(colors.cyan, `Sent ${i}/${maxRequests} requests...`);
    }
  }

  // Wait for all requests to complete
  const results = await Promise.all(requests);
  const endTime = Date.now();

  log(colors.cyan, `\nCompleted in ${endTime - startTime}ms\n`);

  // Analyze results
  const blocked429 = results.filter(r => r.status === 429).length;
  const success200 = results.filter(r => r.status === 200).length;
  const other = results.length - blocked429 - success200;

  log(colors.blue, 'Results:');
  log(colors.yellow, `  Total requests sent: ${maxRequests}`);
  log(colors.green, `  Successful (200): ${success200}`);
  log(colors.red, `  Rate limited (429): ${blocked429}`);
  log(colors.yellow, `  Other status codes: ${other}`);

  if (blocked429 > 0) {
    const percentage = ((blocked429 / maxRequests) * 100).toFixed(2);
    log(colors.green, `\n✓ RATE LIMITING ACTIVE - ${percentage}% of requests were blocked`);
    log(colors.green, '✓ DDoS protection is working');
  } else {
    log(colors.red, '\n⚠ WARNING - No rate limiting detected');
    log(colors.red, '⚠ Server may be vulnerable to DDoS attacks');
  }
}

// ==================== NOSOQL INJECTION TESTS ====================

async function testNoSQLInjection() {
  log(colors.magenta, '\n========== NoSQL INJECTION TESTS ==========\n');

  const noSQLPayloads = [
    {
      name: 'MongoDB Operator Injection',
      payload: { $ne: null },
      test: async () => {
        return makeRequest('/login', 'POST', {
          username: { $ne: null },
          password: 'test'
        });
      }
    },
    {
      name: 'MongoDB $gt Operator',
      payload: { $gt: '' },
      test: async () => {
        return makeRequest('/login', 'POST', {
          username: { $gt: '' },
          password: 'test'
        });
      }
    },
    {
      name: 'MongoDB $where Operator',
      payload: { $where: '1==1' },
      test: async () => {
        return makeRequest('/login', 'POST', {
          username: { $where: '1==1' },
          password: 'test'
        });
      }
    }
  ];

  for (const test of noSQLPayloads) {
    try {
      log(colors.blue, `\nTest: ${test.name}`);
      log(colors.yellow, `Payload: ${JSON.stringify(test.payload)}`);

      const response = await test.test();

      if (response.statusCode === 400 || response.statusCode === 403) {
        log(colors.green, `✓ BLOCKED - Status: ${response.statusCode}`);
        log(colors.green, '✓ NoSQL Injection protection ACTIVE');
      } else if (response.statusCode === 200) {
        log(colors.red, `⚠ WARNING - Request passed (Status: ${response.statusCode})`);
      }
    } catch (error) {
      log(colors.red, `✗ Error: ${error.message}`);
    }
  }
}

// ==================== PATH TRAVERSAL TESTS ====================

async function testPathTraversal() {
  log(colors.magenta, '\n========== PATH TRAVERSAL TESTS ==========\n');

  const pathTraversalPayloads = [
    {
      name: 'Basic Path Traversal',
      payload: '../../etc/passwd',
      test: async () => {
        return makeRequest('/?file=../../etc/passwd');
      }
    },
    {
      name: 'Windows Path Traversal',
      payload: '..\\..\\windows\\system32',
      test: async () => {
        return makeRequest('/?path=..\\..\\windows\\system32');
      }
    },
    {
      name: 'Encoded Path Traversal',
      payload: '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      test: async () => {
        return makeRequest('/?file=%2e%2e%2f%2e%2e%2fetc%2fpasswd');
      }
    }
  ];

  for (const test of pathTraversalPayloads) {
    try {
      log(colors.blue, `\nTest: ${test.name}`);
      log(colors.yellow, `Payload: ${test.payload}`);

      const response = await test.test();

      if (response.statusCode === 403) {
        log(colors.green, `✓ BLOCKED - Status: ${response.statusCode}`);
        log(colors.green, '✓ Path Traversal protection ACTIVE');
      } else if (response.statusCode === 200) {
        log(colors.yellow, `? Request passed - Manual verification needed`);
      }
    } catch (error) {
      log(colors.red, `✗ Error: ${error.message}`);
    }
  }
}

// ==================== CSRF TESTS ====================

async function testCSRF() {
  log(colors.magenta, '\n========== CSRF (Cross-Site Request Forgery) TESTS ==========\n');

  try {
    log(colors.blue, 'Test: POST request without CSRF token');

    const response = await makeRequest('/register', 'POST', {
      username: 'testuser',
      email: 'test@test.com',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#'
    });

    if (response.statusCode === 403) {
      log(colors.green, `✓ BLOCKED - Status: ${response.statusCode}`);
      log(colors.green, '✓ CSRF protection ACTIVE');
    } else if (response.statusCode === 200 || response.statusCode === 400) {
      log(colors.yellow, '⚠ Note: CSRF protection may be handled differently');
      log(colors.yellow, `Status: ${response.statusCode}`);
    }
  } catch (error) {
    log(colors.red, `✗ Error: ${error.message}`);
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  log(colors.cyan, '\n╔════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║     SECURITY TESTING SUITE - LaptopShop              ║');
  log(colors.cyan, '║     SQL Injection | XSS | DDoS | NoSQL Injection     ║');
  log(colors.cyan, '╚════════════════════════════════════════════════════════╝\n');

  log(colors.yellow, `Target: ${BASE_URL}\n`);

  try {
    // Test sequence
    await testSQLInjection();
    await testXSS();
    await testNoSQLInjection();
    await testPathTraversal();
    await testCSRF();
    await testDDoS();

    log(colors.cyan, '\n╔════════════════════════════════════════════════════════╗');
    log(colors.cyan, '║           ALL TESTS COMPLETED                         ║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════╝\n');

    log(colors.green, '✓ Security testing complete!');
    log(colors.green, '✓ Check results above to verify protection effectiveness\n');

  } catch (error) {
    log(colors.red, `\n✗ Test suite error: ${error.message}\n`);
    process.exit(1);
  }
}

// Check if server is running
const url = new URL(BASE_URL);
const protocol = url.protocol === 'https:' ? https : http;

protocol.get(BASE_URL, { rejectUnauthorized: false }, () => {
  runAllTests().catch(error => {
    log(colors.red, `Fatal error: ${error.message}`);
    process.exit(1);
  });
}).on('error', () => {
  log(colors.red, `✗ Cannot connect to ${BASE_URL}`);
  log(colors.red, 'Please ensure the server is running: npm start\n');
  process.exit(1);
});
