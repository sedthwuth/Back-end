const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt'); // ต้องติดตั้ง
const jwt = require('jsonwebtoken'); // ต้องติดตั้ง

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key'; 

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let connection;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอก username และ password' });
    }

    try {
        connection = await db.getConnection();
        const [rows] = await connection.query('SELECT customer_id, username, password FROM tbl_customers WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Username หรือ Password ไม่ถูกต้อง' });
        }

        const user = rows[0];
        // ตรวจสอบ Password (ต้องมี Logic การเปรียบเทียบ bcrypt ที่ถูกต้อง)
        // สมมติฐาน: รหัสผ่านใน DB ถูกแฮชด้วย bcrypt แล้ว
        const isMatch = await bcrypt.compare(password, user.password); 

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Username หรือ Password ไม่ถูกต้อง' });
        }

        // สร้าง JWT Token
        const payload = { customer_id: user.customer_id, username: user.username };
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
});

module.exports = router;