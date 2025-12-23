const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require('bcrypt'); //เพิ่ม bcrypt
const verifyToken = require('../middleware/auth'); //Verify Token

/**
 * @swagger
 * tags:
 * - name: Users
 * description: 
 */ 
// 💡 ต้องแน่ใจว่า description มีข้อความ หรือถ้าเป็น Object ต้องสมบูรณ์

/**
 * @openapi
 * /api/users:
 *   get:
 *      tags: [Users]
 *      summary: Test DB connection
 *      responses:
 *        200:
 *          description: OK
*/
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, firstname, fullname, lastname FROM tbl_users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// GET user by id
/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *      tags: [Users]
 *      summary: Test DB connection
 *      responses:
 *        200:
 *          description: OK
*/
router.get('/:id', async (req, res) => {
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
/**
 * @openapi
 * /api/users:
 *   post:
 *      tags: [Users]
 *      summary: Test DB connection
 *      responses:
 *        200:
 *          description: OK
*/
router.post('/', async (req, res) => {
    // ... (ส่วนรับค่าจาก req.body)
    const { username, password, firstname, fullname, lastname, email } = req.body;

    if (!username || !password || !firstname) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็น (username, password, firstname)' });
    }

    let connection;
    try {
        connection = await db.getConnection();

        // 1. ตรวจสอบความซ้ำซ้อนของ Username
        const [existingUser] = await connection.query('SELECT id FROM tbl_users WHERE username = ?', [username]);

        if (existingUser.length > 0) {
            // 💡 ส่ง 409 Conflict เพื่อแก้ TC1
            return res.status(409).json({ error: 'Username นี้ถูกใช้งานแล้ว' }); 
        }

        // 2. Hash Password ก่อนบันทึก
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Insert ข้อมูล (ปรับ field ให้ตรงกับ DB ของคุณ)
        const result = await connection.query(
            'INSERT INTO tbl_users (username, password, firstname, fullname, lastname, email) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, firstname, fullname, lastname, email]
        );

        // 4. ส่ง 201 Created เมื่อสำเร็จ
        res.status(201).json({
            id: result.insertId,
            message: 'ลงทะเบียนสำเร็จ',
            username: username
        });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
    } finally {
        if (connection) connection.release();
    }
});

// PUT: อัปเดตข้อมูลผู้ใช้ + เปลี่ยนรหัสผ่านถ้ามีส่งมา
/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *      tags: [Users]
 *      summary: Test DB connection
 *      responses:
 *        200:
 *          description: OK
*/
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { firstname, fullname, lastname, password } = req.body;

  try {
    let query = 'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?';
    const params = [firstname, fullname, lastname];

    // ถ้ามี password ใหม่ให้ hash แล้วอัปเดตด้วย
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE user
/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *      tags: [Users]
 *      summary: Test DB connection
 *      responses:
 *        200:
 *          description: OK
*/
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM tbl_users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;