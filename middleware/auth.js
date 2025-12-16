// Middleware ตรวจสอบ JWT Token
const jwt = require('jsonwebtoken');

// โหลดค่า Secret Key
const SECRET_KEY = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  // 1. อ่าน token จาก header ชื่อ Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // ตัดคำว่า "Bearer" ออก เอาแค่ตัว Token

  // 2. ถ้าไม่มี token ส่งมา (หรือหาไม่เจอ) -> คืนค่า 401 Unauthorized
  if (!token) {
    return res.status(401).json({ error: 'Access denied, token missing' });
  }

  try {
    // 3. ตรวจสอบ token ด้วย jwt.verify()
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // ถ้าผ่าน: เก็บข้อมูล user ไว้ใน request เพื่อให้ API ถัดไปใช้ต่อ
    req.user = decoded; 
    
    // 4. ไปยัง API ถัดไป
    next(); 
  } catch (err) {
    // 5. ถ้า token ไม่ถูกต้อง หรือหมดอายุ -> คืนค่า 401 Unauthorized
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = verifyToken;