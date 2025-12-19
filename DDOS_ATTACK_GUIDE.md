# 🚨 DDoS (Distributed Denial of Service) Attack - Hiểu biết & Phòng chống

## 📌 DDoS là gì?

**DDoS** = Distributed Denial of Service

```
Mục tiêu: Làm quá tải server → Website không thể truy cập
Phương pháp: Gửi volume request rất lớn từ nhiều IP khác nhau
Kết quả: Server không thể xử lý → Down/Slow
```

---

## 🔴 Loại DDoS Attack

### 1. **Volumetric Attack** (Layer 7 - Application)
```
Attacker gửi hàng triệu request HTTP đến server
GET /login
GET /profile
GET /api/users
...

Result:
- Server bandwidth cạn kiệt
- Không thể phục vụ user legitimate
- Website down 30 phút - vài giờ
```

**Ví dụ:**
```bash
# Attacker dùng botnet (10,000 máy)
# Mỗi máy gửi 1000 request/giây
# = 10 triệu request/giây
# → Server quá tải
```

### 2. **SYN Flood** (Layer 3 - Network)
```
Attacker gửi hàng loạt SYN packet (initial TCP handshake)
Server phải allocate resources cho mỗi connection
Nhưng attacker không complete handshake
→ Server run out of connection slots
```

### 3. **UDP Flood** (Layer 4 - Transport)
```
Gửi hàng loạt UDP packets vào random ports
Server phải respond lại → Bandwidth cạn
```

### 4. **DNS Amplification** (Reflected DDoS)
```
Attacker spoof IP address = victim's IP
Request DNS queries đến public DNS servers
→ DNS respond to victim's IP
→ Victim bị flood với DNS responses
```

---

## 🛡️ Phòng chống DDoS

### 1. **Rate Limiting** (Ứng dụng)
```javascript
// Giới hạn requests per IP
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 phút
  max: 100,                  // Max 100 requests
  skip: (req) => req.ip === '127.0.0.1'  // Skip localhost
});

app.use(limiter);
```

**Hiệu quả:** Chặn single-source attack, nhưng không hiệu quả với distributed attack

---

### 2. **CloudFlare / WAF (Web Application Firewall)**
```
Khi user truy cập:
1. Request đi đến CloudFlare (không trực tiếp server)
2. CloudFlare phát hiện DDoS patterns
3. Chặn malicious traffic
4. Chỉ forward legitimate traffic đến server

CloudFlare có thể:
- Block by IP reputation
- CAPTCHA challenge
- Rate limit aggressive IPs
- Detect bot patterns
```

**Diagram:**
```
Attacker (Botnet)
├─ IP: 1.2.3.4 ─┐
├─ IP: 5.6.7.8 ─┤
├─ IP: 9.10.11.12┤
└─ ...          │
               ▼
        ┌──────────────┐
        │  CloudFlare  │ ← Phát hiện DDoS
        │  (CDN/WAF)   │ ← Block malicious
        └──────┬───────┘
               │ (Clean traffic only)
               ▼
        ┌──────────────┐
        │  Your Server │ ← Protected
        │  tmd1907...  │
        └──────────────┘
```

---

### 3. **Load Balancing**
```
Phân tán traffic đến nhiều servers
Nếu 1 server down, traffic đi sang server khác
```

```
                    ┌─ Server 1
                    │
Load Balancer ──────┼─ Server 2
(Nginx/HAProxy)     │
                    └─ Server 3

Nếu Server 1 down:
- LB detect failure
- Forward traffic to Server 2, 3
- Tất cả users vẫn access được
```

---

### 4. **Anycast Network**
```
Traffic từ nhiều locations được route
đến server gần nhất
Nếu 1 location bị attack, 
users ở locations khác vẫn ok
```

---

### 5. **IP Reputation / Geo-blocking**
```javascript
// Block countries với high attack rates
const geoip = require('geoip-lite');

app.use((req, res, next) => {
  const geo = geoip.lookup(req.ip);
  
  // Block known attack countries
  if (['KP', 'IR'].includes(geo?.country)) {
    return res.status(403).send('Access Denied');
  }
  
  next();
});
```

---

### 6. **Behavioral Analysis**
```
Monitor traffic patterns:
- Normal user: 10 requests/phút, varied endpoints
- Attacker bot: 1000 requests/phút, same endpoint

Block if:
├─ Same IP: 100+ requests/phút
├─ Sequential IPs (botnet): Block subnet
├─ Repeated failed logins: CAPTCHA challenge
├─ Suspicious User-Agent: Block
└─ Same endpoint repeatedly: Rate limit
```

---

## 📊 So sánh: Brute Force vs DDoS

| Aspect | Brute Force | DDoS |
|--------|-----------|------|
| **Mục tiêu** | Crack password | Làm down server |
| **Method** | POST /login 1000x | GET / 1000000x |
| **Volume** | Thấp (controlled) | Rất cao |
| **Endpoint** | /login | Nhiều endpoints |
| **Headers** | Giống nhau | Giống nhau |
| **Detection** | Rate limit/Account lock | Traffic volume |
| **Phòng chống** | 429 status | WAF/CloudFlare |

---

## 🧪 Demo: Simulated DDoS Attack

```bash
# Created files:
# - demo-ddos-simulation.js  (mô phỏng controlled DDoS)
# - ddos-defense-test.js     (test phòng chống)
```

### ⚠️ DISCLAIMER
```
Những script này:
- Chỉ dùng để HỌC TẬP
- Test trên LOCAL server hoặc lab environment
- KHÔNG gửi requests đến hệ thống thực tế
- Violation = Tội phạm hình sự ⚖️
```

---

## 🔐 DDoS Mitigation Checklist

### Ứng dụng level
- [ ] Rate limiting enabled (express-rate-limit)
- [ ] Connection timeout set
- [ ] Max request size limited
- [ ] Suspicious request patterns logged
- [ ] IP reputation checked

### Infrastructure level
- [ ] CloudFlare / CDN configured
- [ ] WAF (Web Application Firewall) active
- [ ] Load balancer distributing traffic
- [ ] Auto-scaling enabled
- [ ] DDoS protection service subscribed

### Monitoring level
- [ ] Real-time traffic monitoring
- [ ] Alert on traffic spikes (>2x normal)
- [ ] Automated response to DDoS patterns
- [ ] Incident response plan documented
- [ ] Backup servers ready

---

## 📈 Hệ thống hiện tại (tmd1907.id.vn)

### Hiện có protections:
✅ Rate limiting (100/15min general, 5/15min strict login)
✅ Account lockout (10 failed attempts)
✅ CSRF protection
✅ Input validation & sanitization
✅ Audit logging

### Cần thêm để chống DDoS:
❌ CloudFlare / WAF
❌ Load balancing
❌ IP reputation checking
❌ Behavioral analysis
❌ DDoS protection service

---

## 🚀 Recommendations

### Level 1 (Ngay lập tức)
```javascript
// Stricter rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 phút
  max: 50,                    // Lower limit
  standardHeaders: true,      // Log
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1',
  message: 'Quá nhiều request, vui lòng thử lại sau'
});

// Apply tới tất cả routes
app.use(limiter);
```

### Level 2 (Trong tuần)
- Tích hợp CloudFlare
- Enable DDoS Protection

### Level 3 (Production)
- Subscribe đến DDoS Protection service
- Implement WAF rules
- Load balancer (Nginx)
- Multi-server setup

---

## 📚 Real-world Examples

### Daphne, 2016 - Mirai Botnet
```
- 600,000+ IoT devices bị hack
- Gửi 620 Gbps traffic
- KnownHosting down 30 phút
- Cost: Millions in damages
```

### GitHub, 2018 - Memcached DDoS
```
- 1.3 Tbps (Terabit/sec) attack
- Largest DDoS ever recorded
- Memcached servers misconfigured
- Protected by Akamai
```

---

## ✅ Kết luận

**DDoS attacks không phải là hacking password, mà là:**
- Làm quá tải infrastructure
- Sử dụng botnet (hàng nghìn máy)
- Cần phòng chống ở infrastructure level
- Không thể 100% prevent, nhưng có thể mitigate

**Cách bảo vệ tốt nhất:**
1. **Use CDN/WAF** (CloudFlare, Akamai)
2. **Rate limiting** (application level)
3. **Load balancing** (distribute traffic)
4. **Monitoring** (detect patterns)
5. **Incident response** (have a plan)

---

**Version:** 1.0  
**Created:** December 20, 2025  
**Status:** Educational Material ✅
