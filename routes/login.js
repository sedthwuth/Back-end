const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * @openapi
 * /api/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login เข้าสู่ระบบ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin_test
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login success
 *       401:
 *         description: Invalid credentials
 */
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT * FROM tbl_users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("INPUT PASSWORD:", password);
    console.log("DB HASH:", user.password);
    console.log("MATCH RESULT:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.users_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        username: user.username,
        role: user.role,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
