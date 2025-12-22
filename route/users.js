const express = require('express');
const router = express.Router();
// สมมติว่าไฟล์ db อยู่ที่ config/db และ auth อยู่ที่ middleware/auth
const db = require('../config/db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/auth');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'METjMXahPtaHtP5JmnGHzxL3gZYeDP23o';

// ================== Register API (POST /register) ==================
router.post('/register', async (req, res) => {
    // ดึงตัวแปรออกมาครบถ้วน
    // **ใช้ first_name, last_name** ตามโครงสร้าง DB ที่แก้ไขใหม่
    const { username, password, first_name, last_name, address, phone, email } = req.body; 

    // การตรวจสอบค่าที่จำเป็น
    if (!username || !password || !email) {
        return res.status(400).json({ 
            success: false, 
            message: 'กรุณากรอก username, password และ email' 
        });
    }

    let connection;
    try {
        connection = await db.getConnection(); 

        // 1. ตรวจสอบว่า username ซ้ำหรือไม่
        const [existingUsers] = await connection.query('SELECT username FROM tbl_customers WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'Username นี้ถูกใช้งานแล้ว' });
        }

        // 2. ตรวจสอบว่า email ซ้ำหรือไม่
        const [existingEmails] = await connection.query('SELECT email FROM tbl_customers WHERE email = ?', [email]);
        if (existingEmails.length > 0) {
            return res.status(409).json({ success: false, message: 'Email นี้ถูกใช้งานแล้ว' });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // ✅ FIX 1 & 2: แก้ชื่อตัวแปรที่ถูกดึงจาก req.body
        const customer_first_name = first_name || username; 

        // 4. INSERT INTO tbl_customers
        // คอลัมน์: (username, password, first_name, last_name, address, phone, email)
        const [result] = await connection.query(
            `INSERT INTO tbl_customers (username, password, first_name, last_name, address, phone, email) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                username, 
                hashedPassword, 
                // ✅ FIX 3: ใช้ตัวแปรที่แก้ไขแล้ว
                customer_first_name, 
                last_name || null, 
                address || null, 
                phone || null, 
                email
            ]
        );

        // 5. สร้าง Token
        const token = jwt.sign(
            { 
                customer_id: result.insertId, 
                username: username 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'ลงทะเบียนสำเร็จ',
            token: token,
            data: {
                customer_id: result.insertId,
                username: username,
                email: email,
                // ✅ FIX 4: ใช้ชื่อ key และตัวแปรที่ถูกต้องใน response
                first_name: customer_first_name, 
                last_name: last_name || null
            }
        });

    } catch (error) {
        console.error('❌ Register Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
            error: error.message 
        });
    } finally {
        if (connection) connection.release(); 
    }
});

// ================== Get All Customers (GET /) ==================
router.get('/', verifyToken, async (req, res) => {
    try {
        // เปลี่ยน frist_name เป็น first_name
        const [customers] = await db.query(
            `SELECT customer_id, username, first_name, last_name, address, phone, email
            FROM tbl_customers 
            ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            message: 'ดึงข้อมูลลูกค้าสำเร็จ',
            total: customers.length,
            data: customers
        });

    } catch (error) {
        console.error('❌ Get Customers Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: error.message });
    }
});

// ================== Get Profile (GET /profile) ==================
router.get('/profile', verifyToken, async (req, res) => {
    try {
        // เปลี่ยน frist_name เป็น first_name
        const [users] = await db.query(
            'SELECT customer_id, username, first_name, last_name, address, phone, email FROM tbl_customers WHERE customer_id = ?',
            [req.user.customer_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้' });
        }

        res.json({ success: true, data: users[0] });

    } catch (error) {
        console.error('❌ Profile Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
    }
});

// ================== Update Profile (PUT /profile) ==================
router.put('/profile', verifyToken, async (req, res) => {
    // เปลี่ยน frist_name เป็น first_name
    const { first_name, last_name, address, phone, email } = req.body;
    
    let connection;
    try {
        connection = await db.getConnection();
        
        await connection.query(
            // เปลี่ยน frist_name เป็น first_name
            `UPDATE tbl_customers 
            SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?
            WHERE customer_id = ?`,
            [first_name, last_name, email, phone, address, req.user.customer_id] // เรียงให้ตรงกับ SET
        );

        res.json({ success: true, message: 'อัพเดทข้อมูลสำเร็จ' });

    } catch (error) {
        console.error('❌ Update Profile Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล', error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================== Get User by ID (GET /:id) ==================
router.get('/:id', verifyToken, async (req, res) => {
    const customerId = req.params.id;

    try {
        // เปลี่ยน frist_name เป็น first_name
        const [users] = await db.query(
            'SELECT customer_id, username, first_name, last_name, address, phone, email FROM tbl_customers WHERE customer_id = ?',
            [customerId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกค้า' });
        }

        res.json({ success: true, data: users[0] });

    } catch (error) {
        console.error('❌ Get User by ID Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
    }
});

// ================== Update User by ID (PUT /:id) ==================
router.put('/:id', verifyToken, async (req, res) => {
    const customerId = req.params.id;
    // เปลี่ยน frist_name เป็น first_name
    const { first_name, last_name, address, phone, email } = req.body;
    
    let connection;
    try {
        connection = await db.getConnection();
        
        const [users] = await connection.query('SELECT customer_id FROM tbl_customers WHERE customer_id = ?', [customerId]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกค้า' });
        }

        // เปลี่ยน frist_name เป็น first_name
        await connection.query(
            `UPDATE tbl_customers 
            SET first_name = ?, last_name = ?, address = ?, phone = ?, email = ?
            WHERE customer_id = ?`,
            [first_name, last_name, address, phone, email, customerId] // เรียงให้ตรงกับ SET
        );

        res.json({
            success: true,
            message: 'อัพเดทข้อมูลลูกค้าสำเร็จ',
            data: {
                customer_id: parseInt(customerId),
                first_name: first_name, // เปลี่ยน frist_name เป็น first_name
                last_name: last_name,
                email: email,
                phone: phone,
                address: address
            }
        });

    } catch (error) {
        console.error('❌ Update User by ID Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล', error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================== Delete User by ID (DELETE /:id) ==================
router.delete('/:id', verifyToken, async (req, res) => {
    const customerId = req.params.id;
    
    let connection;
    try {
        connection = await db.getConnection();
        
        const [users] = await connection.query('SELECT customer_id, username FROM tbl_customers WHERE customer_id = ?', [customerId]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกค้า' });
        }

        await connection.query('DELETE FROM tbl_customers WHERE customer_id = ?', [customerId]);

        res.json({
            success: true,
            message: 'ลบข้อมูลลูกค้าสำเร็จ',
            data: { customer_id: parseInt(customerId), username: users[0].username }
        });

    } catch (error) {
        console.error('❌ Delete User Error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล', error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;