const request = require('supertest');
const app = require('../index'); 

let authToken = ''; 
let testCustomerId = 0;
const DB_TABLE_NAME = 'tbl_users'; 

// === ข้อมูลผู้ใช้สำหรับ Setup ===
const testUser = {
    username: 'test_user_int',
    password: 'Password123',
    email: 'test_int@example.com',
    firstname: 'Test Firstname', 
    lastname: 'Test Lastname',
    fullname: 'Test Firstname Test Lastname', 
};

// === ข้อมูลผู้ใช้สำหรับ TC3 (ลงทะเบียนใหม่) ===
const newUser = {
    username: 'new_user_for_tc3',
    password: 'Password123',
    email: 'new_int@example.com',
    firstname: 'New User', 
    lastname: 'Test',
    fullname: 'New User Test',
};

// === ข้อมูลผู้ใช้สำหรับ TC7 (อัปเดต) ===
const updatedTestUser = {
    firstname: 'Updated Name', 
    lastname: 'Updated Last',
    email: 'updated_int@example.com',
    fullname: 'Updated Name Updated Last' 
};

// ==========================================
// SETUP / TEARDOWN
// ==========================================
const db = require('../config/db');

beforeAll(async () => {
    let conn;
    try {
        conn = await db.getConnection();
        
        // 1. ล้างข้อมูลผู้ใช้เก่าที่อาจค้างอยู่
        await conn.query(`DELETE FROM ${DB_TABLE_NAME} WHERE username = ?`, [testUser.username]);
        await conn.query(`DELETE FROM ${DB_TABLE_NAME} WHERE username = ?`, [newUser.username]);
        
        // 2. Register ผู้ใช้ทดสอบหลัก
        const res = await request(app)
            .post('/api/users') // Path: /api/users
            .send(testUser);
        
        // ตรวจสอบสถานะ: ต้องเป็น 200 หรือ 201
        if (res.statusCode !== 201 && res.statusCode !== 200) { 
            console.error('Initial Register failed with status:', res.statusCode, res.body);
            throw new Error('Initial user registration failed in beforeAll.');
        }

        // 3. Login เพื่อรับ Token
        const loginRes = await request(app)
            .post('/api/login') // Path: /api/login
            .send({ username: testUser.username, password: testUser.password });

        if (loginRes.statusCode !== 200) {
            console.error('Initial Login failed with status:', loginRes.statusCode, loginRes.body);
            throw new Error('Initial login failed in beforeAll.');
        }

        authToken = loginRes.body.token;
        
        // 4. ดึง ID ของผู้ใช้ที่เพิ่งสร้าง
        const [rows] = await conn.query(`SELECT id FROM ${DB_TABLE_NAME} WHERE username = ?`, [testUser.username]);
        testCustomerId = rows[0].id;
        
    } catch (error) {
        console.error('Error during beforeAll setup:', error);
        throw error; 
    } finally {
        if (conn) conn.release(); 
    }
});

afterAll(async () => {
    let cleanupConn;
    try {
        cleanupConn = await db.getConnection();
        // 1. ลบผู้ใช้ทดสอบทิ้ง (ถ้า TC10 ไม่ได้ลบไปแล้ว)
        await cleanupConn.query(`DELETE FROM ${DB_TABLE_NAME} WHERE username = ? OR id = ?`, [testUser.username, testCustomerId]);
        await cleanupConn.query(`DELETE FROM ${DB_TABLE_NAME} WHERE username = ?`, [newUser.username]);
    } catch (error) {
        console.error('Error during afterAll cleanup:', error);
    } finally {
        if (cleanupConn) cleanupConn.release();
        
        // 2. ปิด DB Connection Pool 
        await db.end();
    }
});


// ==========================================
// TEST CASES (10 รายการ)
// ==========================================

describe('User Module Integration Test (10 Cases)', () => {
    
    // --- 1. การทดสอบ Register API ---

    // TC1: ปฏิเสธการลงทะเบียนหาก Username ซ้ำ (ทดสอบ 409)
    it('TC1: Should reject registration if username already exists (409)', async () => {
        const res = await request(app)
            .post('/api/users')
            .send(testUser); // ใช้ testUser เดิม
            
        expect(res.statusCode).toBe(409); 
        expect(res.body).toHaveProperty('error', 'Username นี้ถูกใช้งานแล้ว');
    });

    // TC2: ปฏิเสธการลงทะเบียนหากขาดข้อมูลที่จำเป็น (400)
    it('TC2: Should reject registration if essential data is missing (e.g., password) (400)', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({ ...testUser, password: '' }); // ส่ง password ว่างไป
            
        expect(res.statusCode).toBe(400); 
    });

    // TC3: ลงทะเบียนสำเร็จด้วย Username ใหม่ (201)
    it('TC3: Should successfully register a new user', async () => {
        const res = await request(app)
            .post('/api/users')
            .send(newUser); 
            
        // Router ของคุณส่ง 201 
        expect(res.statusCode).toBe(201); 
        expect(res.body).toHaveProperty('id');
    });

    // --- 2. การทดสอบ Login API ---

    // TC4: ปฏิเสธการ Login หาก Password ผิด (401)
    it('TC4: Should reject login with incorrect password (401)', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: testUser.username, password: 'WrongPassword' });
            
        expect(res.statusCode).toBe(401); 
    });

    // TC5: เข้าสู่ระบบสำเร็จและได้รับ Token (200)
    it('TC5: Should successfully login and receive an authentication token (200)', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: testUser.username, password: testUser.password });
            
        expect(res.statusCode).toBe(200); 
        expect(res.body).toHaveProperty('token'); 
    });


    // --- 3. การทดสอบ Profile API ---

    // TC6: ดึงข้อมูลโปรไฟล์สำเร็จ (200)
    it('TC6: Should get profile data successfully using the token (200)', async () => {
        const res = await request(app)
            .get('/api/users') 
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        
        // 💡 ตรวจสอบคุณสมบัติสำคัญด้วย 'firstname' (Camel Case)
        expect(res.body[0]).toHaveProperty('id', testCustomerId);
        expect(res.body[0]).toHaveProperty('firstname', testUser.firstname); 
    });
    
    // TC7: อัปเดตข้อมูลโปรไฟล์สำเร็จ (200)
    it('TC7: Should update profile data successfully (200)', async () => {
        const res = await request(app)
            .put(`/api/users/${testCustomerId}`) // ใช้ PUT /api/users/:id
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedTestUser);

        expect(res.statusCode).toBe(200);
        
        // ตรวจสอบการอัปเดตด้วยการเรียก GET profile อีกครั้ง
        const checkRes = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${authToken}`);
            
        // 💡 ตรวจสอบ 'firstname' (Camel Case) ที่ถูกอัปเดต
        expect(checkRes.body[0].firstname).toBe(updatedTestUser.firstname);
    });

    // TC8: ปฏิเสธการเข้าถึง Profile เมื่อไม่มี Token (401)
    it('TC8: Should reject access to profile if no token is provided (401)', async () => {
        const res = await request(app)
            .get('/api/users'); // ไม่ส่ง Header Authorization
            
        expect(res.statusCode).toBe(401); 
    });


    // --- 4. การทดสอบ Admin/CRUD Function ---
    
    // TC9: ดึงข้อมูลลูกค้าตาม ID สำเร็จ (200)
    it('TC9: Should get customer data by ID successfully (200)', async () => {
        const res = await request(app)
            .get(`/api/users/${testCustomerId}`); 
            // Router ของคุณไม่ได้ใช้ verifyToken สำหรับ GET /:id ดังนั้นไม่จำเป็นต้องส่ง Token (แต่ควรทำ)

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('id', testCustomerId);
    });

    // TC10: ลบผู้ใช้สำเร็จ (200)
    it('TC10: Should successfully delete the test user (200)', async () => {
        const res = await request(app)
            .delete(`/api/users/${testCustomerId}`) 
            .set('Authorization', `Bearer ${authToken}`); // 💡 Router นี้ไม่มี Middleware แต่การมี Token ถือเป็น Best Practice

        expect(res.statusCode).toBe(200); 
        
        // ตรวจสอบว่าถูกลบจริงใน DB
        const [rows] = await db.query(`SELECT id FROM ${DB_TABLE_NAME} WHERE id = ?`, [testCustomerId]);
        expect(rows.length).toBe(0);
        // กำหนด testCustomerId เป็น 0 เพื่อให้ afterAll ไม่พยายามลบซ้ำ
        testCustomerId = 0; 
    });

});