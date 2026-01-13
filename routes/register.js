const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// POST: Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอก username และ password'
    });
  }

  try {
    // check ซ้ำ
    const [exists] = await db.query(
      'SELECT users_id FROM tbl_users WHERE username = ?',
      [username]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'username นี้ถูกใช้แล้ว'
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert
    await db.query(
      'INSERT INTO tbl_users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด'
    });
  }
});

module.exports = router;
