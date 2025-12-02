// server.js

// 1. IMPORTS (โหลด Library และ Config ต่างๆ ไว้บนสุด)
require('dotenv').config({ path: './.env' });
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/auth'); // ต้องมั่นใจว่าไฟล์นี้มีอยู่จริง

const app = express();
app.use(express.json());

// 2. CONFIGURATION (ตั้งค่าตัวแปรระบบ)
const SECRET_KEY = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

// 3. DATABASE CONNECTION
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// ================= ROUTES (เส้นทางต่างๆ) =================

// Route 1: ทดสอบการเชื่อมต่อ
app.get('/ping', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT NOW() AS now');
        res.json({ status: 'ok', time: rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Route 2: ดึงข้อมูลผู้ใช้ทั้งหมด (Public)
app.get('/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tbl_users');
        res.json(rows);
    } catch (err) {
        console.error("GET /users failed:", err);
        res.status(500).json({ error: 'Query failed' });
    }
});

// Route 3: ดึงข้อมูลผู้ใช้ตาม ID (Public)
app.get('/users/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM tbl_users WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// Route 4: สมัครสมาชิก (Register)
app.post('/users', async (req, res) => {
    const { firstname, fullname, lastname, username, password, status } = req.body;
    try {
        if (!password) return res.status(400).json({ error: 'Password is required' });

        // ตรวจสอบ Username ซ้ำก่อน
        const [existing] = await db.query('SELECT id FROM tbl_users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO tbl_users (firstname, fullname, lastname, username, password, status) VALUES (?, ?, ?, ?, ?, ?)',
            [firstname, fullname, lastname, username, hashedPassword, status]
        );

        res.status(201).json({ id: result.insertId, firstname, fullname, lastname, username, status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Insert failed' });
    }
});

// Route 5: เข้าสู่ระบบ (Login)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign(
            { id: user.id, fullname: user.fullname, lastname: user.lastname, username: user.username },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        // ส่งข้อมูลผู้ใช้ที่ไม่รวม Password กลับไปด้วย
        const { password: _, ...userInfo } = user;
        res.json({ message: 'Login successful', token, user: userInfo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Route 6: แก้ไขข้อมูล (Update)
app.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { firstname, fullname, lastname, username, password, status } = req.body;
    try {
        let updateData = { firstname, fullname, lastname, username, status };
        let sql = 'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?, username = ?, status = ?';
        let values = [firstname, fullname, lastname, username, status];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql += ', password = ?';
            values.push(hashedPassword);
        }

        sql += ' WHERE id = ?';
        values.push(id);

        const [result] = await db.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Route 7: ลบผู้ใช้ (Delete)
app.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM tbl_users WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Route 8: INNER JOIN 3 ตาราง (Users + Departments + Positions)
app.get('/users-details', async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.id, 
                u.fullname, 
                u.username, 
                d.dept_name, 
                p.position_name
            FROM 
                tbl_users AS u
            INNER JOIN 
                tbl_departments AS d ON u.department_id = d.id
            INNER JOIN 
                tbl_positions AS p ON u.position_id = p.id
        `;

        const [rows] = await db.query(sql);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No data found matching the join criteria' });
        }

        res.json(rows);
    } catch (err) {
        console.error("Join Error:", err);
        res.status(500).json({ error: 'Database join failed' });
    }
});

// --- Route ที่เพิ่มใหม่ (เพื่อให้ครบ 10 ฟังก์ชัน) ---

// Route 9: ดึงข้อมูลผู้ใช้ปัจจุบันที่ Login (Protected Route)
// ต้องใช้ Middleware: verifyToken เพื่อตรวจสอบ JWT
app.get('/protected-user', verifyToken, async (req, res) => {
    try {
        // req.user ถูกเพิ่มมาจาก verifyToken (มี user.id)
        const [rows] = await db.query('SELECT id, firstname, fullname, lastname, username, status FROM tbl_users WHERE id = ?', [req.user.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error("Protected user route failed:", err);
        res.status(500).json({ error: 'Failed to retrieve user data' });
    }
});

// Route 10: ค้นหาผู้ใช้ตามชื่อเต็ม
app.get('/users/search', async (req, res) => {
    const { fullname } = req.query; // รับค่าจาก Query Parameter: /users/search?fullname=สมชาย
    if (!fullname) {
        return res.status(400).json({ error: 'Query parameter "fullname" is required' });
    }
    
    try {
        const searchTerm = `%${fullname}%`; // ใช้ % สำหรับ LIKE search
        const [rows] = await db.query(
            'SELECT id, firstname, fullname, lastname, username, status FROM tbl_users WHERE fullname LIKE ?',
            [searchTerm]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No users found matching the search criteria' });
        }
        
        res.json(rows);
    } catch (err) {
        console.error("User search failed:", err);
        res.status(500).json({ error: 'Database search failed' });
    }
});

// Route: ตัวอย่างการทำ Logout (ไม่นับเป็น Route หลักใน API แต่มีประโยชน์)
app.post('/logout', (req, res) => {
    // ในฝั่ง Server, เราไม่ต้องทำอะไรกับ Token เพราะ Token จะหมดอายุเอง
    // การ "Logout" จริงๆ เกิดขึ้นที่ Client โดยการลบ Token ออกจาก Local Storage
    res.json({ message: "Logged out" });
});

// ================= START SERVER =================
// บรรทัดนี้ต้องอยู่ล่างสุดเสมอ
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
module.exports = app