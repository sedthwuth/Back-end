const express = require("express");
const router = express.Router(); // ✅ แก้ไข Reference Error: ใช้ 'router'
const db = require("../config/db");
const bcrypt = require('bcrypt');
const verifyToken = require('../middleware/auth'); 

/**
 * @swagger
 * tags:
 * - name: Users
 * description: User management system
 */ 

// GET all users (Requires Token)
router.get('/', verifyToken, async (req, res) => {
  try {
    // ✅ เลือกเฉพาะ field ที่มีใน DB (ตัด addrss, email ออก)
    const [rows] = await db.query('SELECT id, username, firstname, fullname, lastname, status FROM tbl_users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// GET user by id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // ✅ เลือกเฉพาะ field ที่มีใน DB
    const [rows] = await db.query('SELECT id, username, firstname, fullname, lastname FROM tbl_users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// POST: Register New User
router.post('/', async (req, res) => { 
    // ✅ ตัด email ออก
    const { username, password, firstname, fullname, lastname } = req.body; 

    if (!username || !password || !firstname) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let connection;
    try {
        connection = await db.getConnection();

        // 1. Check duplicate
        const [existingUser] = await connection.query('SELECT id FROM tbl_users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'Username already exists' }); 
        }

        // 2. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Insert (✅ ตัด email ออกจาก Query)
        const [result] = await connection.query(
            'INSERT INTO tbl_users (username, password, firstname, fullname, lastname) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, firstname, fullname, lastname]
        );

        res.status(201).json({ id: result.insertId, message: 'User created' });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Registration failed' });
    } finally {
        if (connection) connection.release();
    }
});

// PUT: Update User
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  // ✅ ตัด email ออก
  const { firstname, fullname, lastname, password } = req.body;

  try {
    // ✅ ตัด email ออกจาก Query
    let query = 'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?';
    const params = [firstname, fullname, lastname]; 

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