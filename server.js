//server.js
require('dotenv').config(); // โหลดค่าจาก .env

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt'); //เพิ่ม bcrypt
const app = express();
const verifyToken = require('./middleware/auth');
app.use(express.json());


// ใช้ค่าจาก .env
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, //เพิ่ม port
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});
// Route ทดสอบการเชื่อมต่อ
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS now');
    res.json({ status: 'ok', time: rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// โค้ดที่แก้ไขแล้วสำหรับ GET /users
app.get('/users', async (req, res) => {
  try {
    // ใช้ชื่อตารางที่ถูกต้อง
    const [rows] = await db.query('SELECT * FROM tbl_users'); 
    res.json(rows);
  } catch (err) {
    // แนะนำให้ log error ออกมาดูใน console
    console.error("GET /users failed:", err); 
    res.status(500).json({ error: 'Query failed' });
  }
});

// GET users (protected)
app.get('/users', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname FROM tbl_users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// GET /users/:id - ดึงข้อมูลผู้ใช้ตาม id
app.get('/users/:id', async (req, res, next) => {
  const { id } = req.params; // ดึง id จาก URL เช่น /users/3
  try {
    const [rows] = await db.query('SELECT * FROM tbl_users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]); // ส่งผู้ใช้คนเดียวกลับไป
  } catch (err) {
    next(err);
  }
});

// GET user by id (protected)
app.get('/users/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname FROM tbl_users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

//POST: เพิ่มผู้ใช้ใหม่ พร้อม hash password
app.post('/users', async (req, res) => {
  const { firstname, fullname, lastname, username, password, status } = req.body;

  try {
    if (!password) return res.status(400).json({ error: 'Password is required' });

    // เข้ารหัส password
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO tbl_users (firstname, fullname, lastname, username,password, status) VALUES (?, ?, ?, ?, ?, ?)',
      [firstname, fullname, lastname, username,  hashedPassword, status]
    );

    res.json({ id: result.insertId, firstname, fullname, lastname, username, password, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Insert failed' });
  }
});

// POST: เข้าสู่ระบบ (Login)
app.post('/login', async (req, res) => {
  const { username, password } = req.body; // ใช้ fullname หรืออาจเปลี่ยนเป็น username ตามโครงสร้างจริง

  try {
    const [rows] = await db.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const user = rows[0];

    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    // สร้าง JWT token
    const token = jwt.sign(
      { id: user.id, fullname: user.fullname, lastname: user.lastname },
      SECRET_KEY,
      { expiresIn: '1h' } // อายุ token 1 ชั่วโมง
    );

    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});
//PUT /users/:id - แก้ไขข้อมูลผู้ใช้
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { firstname, fullname, lastname,username,password, status } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?,  username = ?,  password = ?, status = ?, WHERE id = ?',
      [firstname, fullname, lastname,username,password, status, id]
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
//DELETE /users/:id - ลบผู้ใช้
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
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET; // ควรเก็บใน .env

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));