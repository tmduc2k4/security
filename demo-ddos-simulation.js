/**
 * DEMO: Simulated DDoS Attack (Educational Only)
 * 
 * ⚠️ DISCLAIMER:
 * - Chỉ dùng cho mục đích học tập
 * - Test trên local/lab environment
 * - KHÔNG dùng để tấn công hệ thống thực tế
 * - Violations = Tội phạm hình sự
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';  // Use localhost, NOT production!
const NUM_CONCURRENT_REQUESTS = 10;        // Số request cùng lúc
const TOTAL_REQUESTS = 100;                // Tổng requests
const TARGET_ENDPOINT = '/';               // Endpoint target

console.log('🚨 DEMO: Simulated DDoS Attack');
console.log('=====================================');
console.log('⚠️  DISCLAIMER: Educational Purpose Only');
console.log('   - Local environment only');
console.log('   - Do NOT use against real systems');
console.log('=====================================\n');

console.log(`Target: ${BASE_URL}${TARGET_ENDPOINT}`);
console.log(`Concurrent Requests: ${NUM_CONCURRENT_REQUESTS}`);
console.log(`Total Requests: ${TOTAL_REQUESTS}`);
console.log(`Rate: ~${Math.floor(TOTAL_REQUESTS / (TOTAL_REQUESTS / NUM_CONCURRENT_REQUESTS))} req/sec\n`);

/**
 * Perform simulated DDoS attack
 */
async function simulateDDoS() {
  let successCount = 0;
  let failureCount = 0;
  let timeoutCount = 0;
  let startTime = Date.now();
  
  // Create array of concurrent requests
  const promises = [];
  
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    // Create a promise for each request
    const requestPromise = (async () => {
      try {
        const response = await axios.get(`${BASE_URL}${TARGET_ENDPOINT}`, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status === 200) {
          successCount++;
        } else if (response.status === 429) {
          console.log(`[Request ${i}] Rate Limited (429)`);
          failureCount++;
        } else if (response.status === 503) {
          console.log(`[Request ${i}] Service Unavailable (503) - Server overloaded!`);
          failureCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`[Request ${i}] Connection Refused - Server down?`);
          failureCount++;
        } else if (error.code === 'ETIMEDOUT') {
          console.log(`[Request ${i}] Timeout - Server slow`);
          timeoutCount++;
        } else {
          failureCount++;
        }
      }
    })();
    
    promises.push(requestPromise);
    
    // Limit concurrent requests
    if (promises.length >= NUM_CONCURRENT_REQUESTS) {
      await Promise.race(promises);
      promises.splice(0, 1);
    }
  }
  
  // Wait for remaining promises
  await Promise.all(promises);
  
  const duration = Date.now() - startTime;
  const throughput = Math.floor((TOTAL_REQUESTS / duration) * 1000);
  
  // Results
  console.log('\n\n=====================================');
  console.log('📊 ATTACK RESULTS');
  console.log('=====================================');
  console.log(`✅ Success:      ${successCount}/${TOTAL_REQUESTS}`);
  console.log(`❌ Failed:       ${failureCount}/${TOTAL_REQUESTS}`);
  console.log(`⏱️  Timeout:     ${timeoutCount}/${TOTAL_REQUESTS}`);
  console.log(`⏱️  Duration:    ${duration}ms`);
  console.log(`📈 Throughput:   ${throughput} req/sec`);
  console.log('=====================================\n');
  
  // Analysis
  console.log('🔍 ANALYSIS:');
  if (failureCount === TOTAL_REQUESTS) {
    console.log('❌ Server is completely down!');
    console.log('   - All requests failed');
    console.log('   - DDoS attack SUCCESSFUL ⚠️');
  } else if (failureCount > TOTAL_REQUESTS / 2) {
    console.log('⚠️  Server is significantly impacted');
    console.log(`   - ${Math.floor((failureCount / TOTAL_REQUESTS) * 100)}% failure rate`);
    console.log('   - Performance degraded');
  } else if (timeoutCount > TOTAL_REQUESTS / 10) {
    console.log('⏱️  Server is slow but operational');
    console.log('   - High latency detected');
    console.log('   - Rate limiting likely active');
  } else {
    console.log('🟢 Server handling traffic well');
    console.log('   - Low failure rate');
    console.log('   - Good throughput');
  }
  
  // Defense mechanisms
  console.log('\n🛡️  SERVER DEFENSE MECHANISMS:');
  if (failureCount > TOTAL_REQUESTS / 2) {
    console.log('✅ Detected DDoS protection:');
    console.log('   - Rate limiting enabled');
    console.log('   - Or load balancer protecting');
    console.log('   - Or WAF blocking requests');
  } else {
    console.log('❌ Potential issues:');
    console.log('   - No rate limiting?');
    console.log('   - No DDoS protection?');
    console.log('   - Needs CloudFlare/WAF');
  }
}

/**
 * Main execution
 */
(async () => {
  try {
    // Check if server is available
    console.log('🔍 Checking server availability...\n');
    try {
      await axios.get(BASE_URL, { timeout: 5000 });
      console.log('✅ Server is online\n');
    } catch {
      console.log('❌ Server is not available or not running');
      console.log(`   Start your server first: npm start\n`);
      return;
    }
    
    console.log('Starting simulated DDoS attack in 3 seconds...\n');
    await sleep(3000);
    
    await simulateDDoS();
    
    console.log('⚠️  REMINDER:');
    console.log('   - This is educational demo only');
    console.log('   - Real DDoS attacks are illegal');
    console.log('   - Use this to understand defense mechanisms\n');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  }
})();

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
