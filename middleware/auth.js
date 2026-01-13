const jwt = require('jsonwebtoken');

/**
 * Middleware สำหรับตรวจสอบ JWT Token ใน Header (Authorization: Bearer <token>)
 */
const verifyToken = (req, res, next) => {
    // ดึง token จาก Authorization header
    const authHeader = req.headers['authorization'];
    
    // ตรวจสอบว่า Header มีรูปแบบ 'Bearer <token>' หรือไม่
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided or token format is incorrect.' });
    }

    // ดึงเฉพาะส่วน token
    const token = authHeader.split(' ')[1]; 
    
    try {
        // ตรวจสอบและถอดรหัส token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_jwt_secret');
        
        // แนบข้อมูลผู้ใช้ที่ถอดรหัสแล้วเข้ากับ request object
        req.user = decoded;
        
        // ไปยัง middleware/route ถัดไป
        next();
    } catch (ex) {
        // Token ไม่ถูกต้อง, หมดอายุ, หรือมีปัญหา
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

module.exports = verifyToken;