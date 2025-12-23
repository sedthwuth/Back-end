const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key'; 

// ใน routes/users.js
/**
 * @swagger
 * tags:
 * - name: Users
 * description: User Management and Authentication // 💡 ให้มี description
 */
// POST: Login API
/**
 * @swagger
 * /api/login:
 * post:
 * tags: [Authentication]
 * summary: เข้าสู่ระบบและรับ JWT Token
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * username:
 * type: string
 * example: tester
 * password:
 * type: string
 * example: password123
 * responses:
 * 200:
 * description: เข้าสู่ระบบสำเร็จและได้รับ Token
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * message:
 * type: string
 * token:
 * type: string
 * 401:
 * description: Username หรือ Password ไม่ถูกต้อง
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let connection;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอก username และ password' });
    }

    try {
        connection = await db.getConnection();
        // 1. ค้นหาผู้ใช้จาก username
        const [rows] = await connection.query('SELECT id, username, password FROM tbl_users WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Username หรือ Password ไม่ถูกต้อง' });
        }

        const user = rows[0];
        // 2. เปรียบเทียบรหัสผ่านที่ส่งมากับรหัสที่ถูกแฮชใน DB
        const isMatch = await bcrypt.compare(password, user.password); 

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Username หรือ Password ไม่ถูกต้อง' });
        }

       // 3. สร้าง JWT Token เมื่อ Login สำเร็จ
        const payload = { users_id: user.id, username: user.username }; 
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ 
            success: true, 
            message: 'เข้าสู่ระบบสำเร็จ',
            token: token
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    } finally {
        if (connection) connection.release();
    }
}); // 💡 จบ router.post('/login') ที่นี่


// POST: Logout API (Stateless/Client-side)
/**
 * @swagger
 * /api/login/logout:
 * post:
 * summary: Invalidate user session (Client must delete token)
 * tags: [Authentication]
 * responses:
 * 200:
 * description: Logout successful (Token should be deleted by the client)
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: Logged out successfully. Please delete your token.
 */
router.post('/logout', (req, res) => {
    // ใน JWT Stateless, Server เพียงแค่แจ้งว่าดำเนินการสำเร็จ
    res.status(200).json({ message: 'Logged out successfully. Please delete your token on the client side.' });
});


module.exports = router; // 💡 module.exports อยู่ด้านนอกสุด