const http = require('http');

// Test 1: Test đăng nhập sai mật khẩu
async function testLoginError() {
  console.log('🧪 Testing login with wrong password...\n');

  // Bước 1: Lấy CSRF token từ trang login
  console.log('📝 Bước 1: Lấy CSRF token từ trang login');
  const getCsrfResponse = await new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/login', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const csrfMatch = data.match(/name="_csrf"\s+value="([^"]+)"/);
        const csrfToken = csrfMatch ? csrfMatch[1] : null;
        const setCookie = res.headers['set-cookie'];
        console.log('✅ CSRF Token:', csrfToken ? '✓ Found' : '✗ Not found');
        console.log('📍 Set-Cookie:', setCookie);
        resolve({ csrfToken, setCookie });
      });
    });
    req.on('error', reject);
  });

  const { csrfToken, setCookie } = getCsrfResponse;

  // Bước 2: Test đăng nhập sai mật khẩu
  console.log('\n📝 Bước 2: Test đăng nhập sai mật khẩu');
  const loginError = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'testuser',
      password: 'wrongpassword',
      _csrf: csrfToken || 'test'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': setCookie ? setCookie[0] : ''
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Status:', res.statusCode);
        console.log('📍 Content-Type:', res.headers['content-type']);
        
        // Kiểm tra response
        if (res.statusCode === 200) {
          const errorMatch = data.match(/error-message"[^>]*>([^<]+)</);
          if (errorMatch) {
            console.log('✅ Error Message (HTML):', errorMatch[1].trim());
          } else {
            console.log('⚠️ Status 200 nhưng không tìm thấy error message');
          }
        } else if (res.statusCode === 500) {
          const errorMatch = data.match(/error-message"[^>]*>([^<]+)</);
          if (errorMatch) {
            console.log('✅ Error Message (HTML):', errorMatch[1].trim());
          } else if (data.includes('Đã xảy ra lỗi')) {
            console.log('⚠️ Response:', data.substring(0, 200));
          }
        } else if (res.statusCode === 401) {
          const errorMatch = data.match(/"error":"([^"]+)"/);
          if (errorMatch) {
            console.log('⚠️ Error (JSON):', errorMatch[1]);
          } else {
            console.log('Response preview:', data.substring(0, 300));
          }
        }

        console.log('\n📊 Response Preview:');
        console.log(data.substring(0, 500) + '...');
        resolve();
      });
    });

    req.on('error', reject);
    
    // Send form-urlencoded instead of JSON
    const formData = `username=testuser&password=wrongpassword&_csrf=${encodeURIComponent(csrfToken || 'test')}`;
    req.write(formData);
    req.end();
  });
}

testLoginError()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
