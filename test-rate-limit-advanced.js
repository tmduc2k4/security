/**
 * COMPREHENSIVE RATE LIMIT TEST
 * Test multiple scenarios
 */

const axios = require('axios');

// Configuration
const SERVERS = [
  { name: 'Local', url: 'http://localhost:3000', active: true },
  { name: 'Production', url: 'https://tmd1907.id.vn', active: false }
];

const TEST_SCENARIOS = [
  {
    name: 'Rapid Fire (10 requests immediately)',
    requests: 10,
    delay: 0,
    description: 'Gửi 10 requests liên tục không delay'
  },
  {
    name: 'Throttled (10 requests với 100ms delay)',
    requests: 10,
    delay: 100,
    description: 'Gửi 10 requests với delay 100ms giữa các requests'
  },
  {
    name: 'Slow (5 requests với 500ms delay)',
    requests: 5,
    delay: 500,
    description: 'Gửi 5 requests với delay 500ms'
  }
];

/**
 * Main Test Function
 */
async function runAllTests() {
  const server = SERVERS.find(s => s.active);

  if (!server) {
    console.error('❌ No active server configured');
    return;
  }

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        RATE LIMIT COMPREHENSIVE TEST                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`🎯 Target: ${server.name} (${server.url})`);
  console.log(`📊 Rate Limit: 5 requests / 15 minutes on /login`);
  console.log(`⏱️  Each test has ~200ms delay between requests\n`);

  for (let scenarioIndex = 0; scenarioIndex < TEST_SCENARIOS.length; scenarioIndex++) {
    const scenario = TEST_SCENARIOS[scenarioIndex];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scenario ${scenarioIndex + 1}: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);
    console.log(`${'='.repeat(60)}\n`);

    const results = await runScenario(server.url, scenario);
    displayResults(results, scenario);
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           TEST COMPLETED                               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

/**
 * Run Single Scenario
 */
async function runScenario(baseUrl, scenario) {
  const results = [];
  const startTime = Date.now();

  for (let i = 1; i <= scenario.requests; i++) {
    const requestTime = Date.now() - startTime;

    try {
      const response = await axios.post(`${baseUrl}/login`, {
        username: 'testuser',
        password: 'wrongpassword'
      }, {
        validateStatus: () => true,
        timeout: 5000
      });

      results.push({
        attempt: i,
        status: response.status,
        time: requestTime,
        message: response.data?.message || response.data?.error || '',
        blocked: response.status === 429
      });

      const statusEmoji = response.status === 429 ? '✋' : '✅';
      console.log(`${statusEmoji} [${requestTime}ms] Req #${i}: ${response.status}`);

      // Delay between requests
      if (i < scenario.requests) {
        await sleep(scenario.delay + 200);
      }

    } catch (error) {
      results.push({
        attempt: i,
        status: 'ERROR',
        time: requestTime,
        message: error.message,
        blocked: false
      });

      console.log(`❌ [${requestTime}ms] Req #${i}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Display Results
 */
function displayResults(results, scenario) {
  const allowed = results.filter(r => r.status !== 429 && r.status !== 'ERROR').length;
  const blocked = results.filter(r => r.status === 429).length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  console.log('\n📈 Results:');
  console.log(`   ✅ Allowed: ${allowed}`);
  console.log(`   ✋ Blocked: ${blocked}`);
  console.log(`   ❌ Errors:  ${errors}`);

  if (blocked > 0) {
    console.log('\n✅ RATE LIMITING DETECTED!');
    const firstBlocked = results.find(r => r.status === 429);
    if (firstBlocked) {
      console.log(`   First blocked at request #${firstBlocked.attempt}`);
      console.log(`   After ${firstBlocked.attempt - 1} allowed requests`);
    }
  } else if (errors === 0) {
    console.log('\n⚠️  NO RATE LIMITING DETECTED');
    console.log(`   All ${allowed} requests were allowed`);
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run tests
 */
runAllTests().catch(console.error);
