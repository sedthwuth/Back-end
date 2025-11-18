// server.js

// 1. IMPORTS (โหลด Library และ Config ต่างๆ ไว้บนสุด)
require('dotenv').config({ path: './.env.local' });
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // ย้ายขึ้นมาบนสุด
const verifyToken = require('./middleware/auth');

const app = express();
app.use(express.json());

// 2. CONFIGURATION (ตั้งค่าตัวแปรระบบ)
const SECRET_KEY = process.env.JWT_SECRET; // ควรมีค่าใน .env
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

// Route: ทดสอบการเชื่อมต่อ
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS now');
    res.json({ status: 'ok', time: rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Route: ดึงข้อมูลผู้ใช้ทั้งหมด (Public)
app.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tbl_users');
    res.json(rows);
  } catch (err) {
    console.error("GET /users failed:", err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Route: ดึงข้อมูลผู้ใช้ตาม ID (Public)
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

// Route: สมัครสมาชิก (Register)
app.post('/users', async (req, res) => {
  const { firstname, fullname, lastname, username, password, status } = req.body;
  try {
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO tbl_users (firstname, fullname, lastname, username, password, status) VALUES (?, ?, ?, ?, ?, ?)',
      [firstname, fullname, lastname, username, hashedPassword, status]
    );

    res.json({ id: result.insertId, firstname, fullname, lastname, username, password, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Insert failed' });
  }
});

// Route: เข้าสู่ระบบ (Login)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, fullname: user.fullname, lastname: user.lastname },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Route: แก้ไขข้อมูล (Update)
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { firstname, fullname, lastname, username, password, status } = req.body;
  try {
    // หมายเหตุ: การ update password ตรงนี้ควร hash ก่อนเหมือนตอน register (ในโค้ดนี้ยังไม่ได้ทำ)
    const [result] = await db.query(
      'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?,  username = ?,  password = ?, status = ? WHERE id = ?',
      [firstname, fullname, lastname, username, password, status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Route: ลบผู้ใช้ (Delete)
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

// Route: INNER JOIN 3 ตาราง (Users + Departments + Positions)
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

//ตัวอย่างการทำ Logout
app.post('/logout', (req, res) => {
  localStorage.removeItem('token');
  res.json({ message: "Logged out" });
});

// ================= START SERVER =================
// บรรทัดนี้ต้องอยู่ล่างสุดเสมอ
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));