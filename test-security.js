// Script kiểm tra bảo mật: SQL Injection, DDoS, XSS
// Chạy server trước, sau đó chạy: node test-security.js

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Security-Test-Script'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
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

// Test 1: SQL Injection Protection
async function testSQLInjection() {
  log(colors.magenta, '\n=== TEST 1: SQL INJECTION PROTECTION ===\n');
  
  const sqlInjectionPayloads = [
    // Basic SQL injection
    { path: "/laptop/1' OR '1'='1", name: "Basic OR injection" },
    { path: "/laptop/1; DROP TABLE users--", name: "Drop table attempt" },
    { path: "/laptop/1 UNION SELECT * FROM users--", name: "UNION injection" },
    
    // Query parameter injection
    { path: "/laptops?sort=price'; DROP TABLE products--", name: "Query param injection" },
    
    // Form data injection
    { 
      path: "/api/auth/login",
      method: "POST",
      data: {
        username: "admin' OR '1'='1'--",
        password: "anything"
      },
      name: "Login form SQL injection"
    },
    
    // Advanced payloads
    { path: "/laptop/1' AND 1=1--", name: "AND injection" },
    { path: "/laptop/1' OR 'x'='x", name: "OR with string comparison" },
    { path: "/laptop/1'; EXEC xp_cmdshell('dir')--", name: "Command execution attempt" }
  ];

  for (const payload of sqlInjectionPayloads) {
    try {
      const response = await makeRequest(
        payload.path, 
        payload.method || 'GET',
        payload.data || null
      );
      
      if (response.statusCode === 403) {
        log(colors.green, `✓ BLOCKED: ${payload.name}`);
        log(colors.blue, `  Status: ${response.statusCode} (SQL Injection detected)`);
      } else if (response.statusCode === 400) {
        log(colors.green, `✓ VALIDATED: ${payload.name}`);
        log(colors.blue, `  Status: ${response.statusCode} (Validation failed)`);
      } else if (response.statusCode === 404) {
        log(colors.yellow, `⚠ NOT FOUND: ${payload.name}`);
        log(colors.blue, `  Status: ${response.statusCode} (Route doesn't exist)`);
      } else {
        log(colors.red, `✗ VULNERABLE: ${payload.name}`);
        log(colors.red, `  Status: ${response.statusCode} (Injection may have succeeded!)`);
      }
    } catch (error) {
      log(colors.red, `✗ ERROR: ${payload.name} - ${error.message}`);
    }
  }
}

// Test 2: DDoS Protection (Rate Limiting)
async function testDDoSProtection() {
  log(colors.magenta, '\n=== TEST 2: DDoS PROTECTION (RATE LIMITING) ===\n');
  
  log(colors.blue, 'Testing normal rate limit (100 requests/15 min)...\n');
  
  const requests = [];
  const numRequests = 110; // Vượt quá limit
  
  // Send multiple requests rapidly
  for (let i = 0; i < numRequests; i++) {
    requests.push(
      makeRequest('/').catch(err => ({ error: err.message, requestNum: i + 1 }))
    );
  }
  
  const startTime = Date.now();
  const responses = await Promise.all(requests);
  const endTime = Date.now();
  
  const successCount = responses.filter(r => r.statusCode === 200).length;
  const blockedCount = responses.filter(r => r.statusCode === 429).length;
  const errorCount = responses.filter(r => r.error).length;
  
  log(colors.blue, `\nResults after ${numRequests} rapid requests:`);
  log(colors.green, `✓ Successful: ${successCount}`);
  log(colors.yellow, `⚠ Rate Limited (429): ${blockedCount}`);
  log(colors.red, `✗ Errors: ${errorCount}`);
  log(colors.blue, `Time taken: ${endTime - startTime}ms`);
  
  if (blockedCount > 0) {
    log(colors.green, `\n✓ RATE LIMITING WORKS! ${blockedCount}/${numRequests} requests were blocked`);
    
    // Check rate limit headers
    const blockedResponse = responses.find(r => r.statusCode === 429);
    if (blockedResponse && blockedResponse.headers) {
      log(colors.blue, '\nRate Limit Headers:');
      log(colors.blue, `  X-RateLimit-Limit: ${blockedResponse.headers['x-ratelimit-limit'] || 'N/A'}`);
      log(colors.blue, `  X-RateLimit-Remaining: ${blockedResponse.headers['x-ratelimit-remaining'] || 'N/A'}`);
      log(colors.blue, `  X-RateLimit-Reset: ${blockedResponse.headers['x-ratelimit-reset'] || 'N/A'}`);
      log(colors.blue, `  Retry-After: ${blockedResponse.headers['retry-after'] || 'N/A'}`);
    }
  } else {
    log(colors.red, '\n✗ RATE LIMITING NOT WORKING! All requests succeeded');
  }
}

// Test 3: Strict Rate Limiting (for sensitive endpoints)
async function testStrictRateLimit() {
  log(colors.magenta, '\n=== TEST 3: STRICT RATE LIMITING (Contact Form) ===\n');
  
  log(colors.blue, 'Testing strict rate limit (5 requests/15 min on contact form)...\n');
  
  const contactPayload = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '0123456789',
    message: 'This is a test message'
  };
  
  const requests = [];
  const numRequests = 10; // Vượt quá strict limit (5)
  
  for (let i = 0; i < numRequests; i++) {
    requests.push(
      makeRequest('/contact', 'POST', contactPayload)
        .catch(err => ({ error: err.message, requestNum: i + 1 }))
    );
  }
  
  const responses = await Promise.all(requests);
  
  const successCount = responses.filter(r => r.statusCode === 200 || r.statusCode === 404).length;
  const blockedCount = responses.filter(r => r.statusCode === 429).length;
  
  log(colors.blue, `\nResults after ${numRequests} rapid contact form submissions:`);
  log(colors.green, `✓ Successful: ${successCount}`);
  log(colors.yellow, `⚠ Rate Limited (429): ${blockedCount}`);
  
  if (blockedCount > 0) {
    log(colors.green, `\n✓ STRICT RATE LIMITING WORKS! ${blockedCount}/${numRequests} requests were blocked`);
  } else {
    log(colors.yellow, '\n⚠ Note: Contact endpoint might not exist yet, but rate limiter should still activate');
  }
}

// Test 4: XSS Protection
async function testXSSProtection() {
  log(colors.magenta, '\n=== TEST 4: XSS PROTECTION ===\n');
  
  const xssPayloads = [
    {
      path: "/api/auth/register",
      method: "POST",
      data: {
        username: "<script>alert('XSS')</script>",
        email: "test@test.com",
        password: "Test123",
        fullName: "<img src=x onerror=alert('XSS')>"
      },
      name: "Registration with XSS in username/fullName"
    },
    {
      path: "/api/auth/login",
      method: "POST",
      data: {
        username: "test<script>alert('XSS')</script>",
        password: "anything"
      },
      name: "Login with XSS in username"
    }
  ];
  
  for (const payload of xssPayloads) {
    try {
      const response = await makeRequest(payload.path, payload.method, payload.data);
      
      // Check if XSS characters were sanitized in response
      if (response.body && (
        response.body.includes('<script>') || 
        response.body.includes('onerror=') ||
        response.body.includes('javascript:')
      )) {
        log(colors.red, `✗ VULNERABLE: ${payload.name}`);
        log(colors.red, `  XSS payload found in response!`);
      } else {
        log(colors.green, `✓ PROTECTED: ${payload.name}`);
        log(colors.blue, `  Status: ${response.statusCode} (XSS sanitized or blocked)`);
      }
    } catch (error) {
      log(colors.yellow, `⚠ ERROR: ${payload.name} - ${error.message}`);
    }
  }
}

// Test 5: Path Traversal Protection
async function testPathTraversal() {
  log(colors.magenta, '\n=== TEST 5: PATH TRAVERSAL PROTECTION ===\n');
  
  const pathTraversalPayloads = [
    { path: "/laptop/../../etc/passwd", name: "Unix path traversal" },
    { path: "/laptop/..\\..\\windows\\system32\\config\\sam", name: "Windows path traversal" },
    { path: "/laptops?file=../../../etc/hosts", name: "Query param path traversal" },
  ];
  
  for (const payload of pathTraversalPayloads) {
    try {
      const response = await makeRequest(payload.path);
      
      if (response.statusCode === 403) {
        log(colors.green, `✓ BLOCKED: ${payload.name}`);
        log(colors.blue, `  Status: ${response.statusCode} (Path traversal detected)`);
      } else {
        log(colors.yellow, `⚠ PASSED: ${payload.name}`);
        log(colors.blue, `  Status: ${response.statusCode}`);
      }
    } catch (error) {
      log(colors.red, `✗ ERROR: ${payload.name} - ${error.message}`);
    }
  }
}

// Test 6: HTTP Security Headers
async function testSecurityHeaders() {
  log(colors.magenta, '\n=== TEST 6: HTTP SECURITY HEADERS (Helmet) ===\n');
  
  try {
    const response = await makeRequest('/');
    const headers = response.headers;
    
    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '0',
      'strict-transport-security': 'max-age=',
      'content-security-policy': "default-src 'self'"
    };
    
    log(colors.blue, 'Checking security headers:\n');
    
    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const headerValue = headers[header.toLowerCase()];
      
      if (headerValue) {
        if (headerValue.includes(expectedValue)) {
          log(colors.green, `✓ ${header}: ${headerValue}`);
        } else {
          log(colors.yellow, `⚠ ${header}: ${headerValue} (unexpected value)`);
        }
      } else {
        log(colors.red, `✗ ${header}: NOT SET`);
      }
    }
  } catch (error) {
    log(colors.red, `✗ ERROR: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  log(colors.blue, '\n╔════════════════════════════════════════════════════════╗');
  log(colors.blue, '║     SECURITY TESTING SUITE - LAPTOPSTORE              ║');
  log(colors.blue, '╚════════════════════════════════════════════════════════╝');
  
  log(colors.yellow, '\n⚠ Make sure the server is running at http://localhost:3000\n');
  
  try {
    // Check if server is running
    await makeRequest('/');
    log(colors.green, '✓ Server is running\n');
  } catch (error) {
    log(colors.red, '✗ Server is NOT running! Please start the server first.');
    log(colors.yellow, '  Run: npm start\n');
    process.exit(1);
  }
  
  try {
    await testSQLInjection();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
    
    await testDDoSProtection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testStrictRateLimit();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testXSSProtection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testPathTraversal();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testSecurityHeaders();
    
    log(colors.magenta, '\n═══════════════════════════════════════════════════════');
    log(colors.green, '✓ SECURITY TESTING COMPLETED');
    log(colors.magenta, '═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    log(colors.red, `\n✗ Test suite failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Run tests
runAllTests();
