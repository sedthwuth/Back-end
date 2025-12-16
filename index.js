require('dotenv').config({ path: './.env' });
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/auth.js'); 
const cors = require('cors'); 
const app = express();

const SECRET_KEY = process.env.JWT_SECRET;

app.use(express.json());
app.use(cors()); // สำหรับแก้ปัญหา "Cannot find module 'cors'" ให้รัน npm install อีกครั้ง

// เชื่อมต่อฐานข้อมูล
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to Food Delivery API (Full CRUD)' });
});

// ==========================================
// 1. REGISTER (AUTH) - แก้ไข ReferenceError: username is not defined และ SQL Typo
// ==========================================
app.post('/auth/register', async (req, res) => {
    // 🚨 แก้ไข: ดึงตัวแปรทั้งหมดจาก req.body
    const { username, password, first_name, last_name, address, phone, email } = req.body; 

    // 1. ตรวจสอบว่ามีข้อมูลครบไหม (ถ้ามี)

    try {
        const [existingUser] = await db.query('SELECT username FROM tbl_customers WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // ✅ แก้ไข: SQL Query ใช้ first_name และ last_name ที่มี underscore
        const [result] = await db.query(
            'INSERT INTO tbl_customers (username, password, first_name, last_name, address, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, first_name, last_name, address, phone, email]
        );

        res.status(201).json({ message: 'Register successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Register failed' });
    }
});

// ==========================================
// 2. LOGIN (AUTH)
// ==========================================
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM tbl_customers WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
    
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid password' });
    
        const token = jwt.sign(
            { id: user.customer_id, username: user.username }, 
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        res.json({ message: 'Login successful', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Route 3: GET /customers (READ ALL)
app.get('/customers', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT customer_id, username, first_name, last_name, email, phone, address FROM tbl_customers');
        res.json(rows);
    } catch (err) {
        console.error(err); 
        res.status(500).json({ error: 'Database error' }); 
    } 
});

// Route 4: UPDATE PROFILE (UPDATE)
app.put('/customers/me', verifyToken, async (req, res) => {
    const { first_name, last_name, address, phone, email } = req.body;
    const customer_id = req.user.id; 

    try {
        const [result] = await db.query(
            'UPDATE tbl_customers SET first_name=?, last_name=?, address=?, phone=?, email=? WHERE customer_id=?',
            [first_name, last_name, address, phone, email, customer_id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

// ==========================================
// 5. GET MENUS (READ JOIN) - แก้ไข Logic SQL
// ==========================================
app.get('/menus', async (req, res) => {
    try {
        const sql = `
            SELECT m.*, r.name AS res_name, r.phone AS res_phone 
            FROM tbl_menus m
            -- ✅ แก้ไข: Logic Join ด้วย restaurant_id ทั้งสองฝั่ง
            JOIN tbl_restaurants r ON m.restaurant_id = r.restaurant_id
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ==========================================
// 6. CREATE ORDER (CREATE)
// ==========================================
app.post('/orders', verifyToken, async (req, res) => {
    const { restaurant_id, menu_id, quantity } = req.body; 
    const customer_id = req.user.id; 

    if (!menu_id || !quantity || !restaurant_id) {
        return res.status(400).json({ error: 'Missing required order details (menu_id, quantity, restaurant_id)' });
    }

    try {
        const [menuRows] = await db.query('SELECT price FROM tbl_menus WHERE menu_id = ?', [menu_id]);
        if (menuRows.length === 0) return res.status(404).json({ error: 'Menu not found' });

        const price = parseFloat(menuRows[0].price);
        const total_price = price * quantity; 

        const [result] = await db.query(
            'INSERT INTO tbl_orders (customer_id, restaurant_id, menu_id, quantity, total_price, status, order_date) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [customer_id, restaurant_id, menu_id, quantity, total_price, 'Pending']
        );

        res.status(201).json({ 
            message: 'Order placed', 
            order_id: result.insertId,
            total_price: total_price
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Order failed' });
    }
});


// ==========================================
// 7. DELETE ORDER (DELETE)
// ==========================================
app.delete('/orders/:id', verifyToken, async (req, res) => {
    const order_id = req.params.id;
    const customer_id = req.user.id;

    try {
        const [check] = await db.query('SELECT * FROM tbl_orders WHERE order_id = ? AND customer_id = ?', [order_id, customer_id]);
        
        if (check.length === 0) {
            return res.status(404).json({ error: 'Order not found or you do not have permission' });
        }

        // หากต้องการลบรายละเอียดออเดอร์ (tbl_order_details) ก่อนด้วยต้องเพิ่มโค้ดที่นี่
        
        await db.query('DELETE FROM tbl_orders WHERE order_id = ?', [order_id]);
        
        res.json({ message: 'Order cancelled successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// ==========================================
// 8. ORDER SUMMARY (READ AGGREGATE)
// ==========================================
app.get('/orders/summary', verifyToken, async (req, res) => {
    const customer_id = req.user.id;

    try {
        const sql = `
            SELECT 
                c.first_name AS customer_name,
                SUM(o.total_price) AS total_amount
            FROM tbl_orders o
            JOIN tbl_customers c ON o.customer_id = c.customer_id
            WHERE o.customer_id = ?
            GROUP BY c.customer_id
        `;
        
        const [rows] = await db.query(sql, [customer_id]);
        
        if (rows.length === 0) {
            // คืนค่า 0 หากไม่มีออเดอร์
            return res.json({ customer_name: 'Unknown', total_amount: 0 });
        }

        res.json({
            customer_name: rows[0].customer_name,
            total_amount: rows[0].total_amount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Food API (Full CRUD) running on http://localhost:${PORT}`));

module.exports = app;