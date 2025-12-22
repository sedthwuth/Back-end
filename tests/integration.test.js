const request = require('supertest');
const app = require('../index'); // สมมติว่าไฟล์หลักคือ index.js และส่งออก 'app'

let authToken = ''; 
let testCustomerId = 0;
let dbConnection; // เปลี่ยนชื่อเป็น dbConnection เพื่อความชัดเจน

// สร้างข้อมูลลูกค้าสำหรับทดสอบ
const testUser = {
    username: 'test_user_int',
    password: 'Password123',
    email: 'test_int@example.com',
    // ✅ FIX 1: เปลี่ยน full_name เป็น first_name
    first_name: 'Test Firstname', 
    last_name: 'Test Lastname',
    phone: '0901234567',
    address: '123 Test Street'
};

const updatedTestUser = {
    // ✅ FIX 2: เปลี่ยน full_name เป็น first_name
    first_name: 'Updated Name', 
    last_name: 'Updated Last',
    email: 'updated_int@example.com',
    phone: '0998765432',
    address: '456 Updated Road'
};

// ==========================================
// SETUP / TEARDOWN
// ==========================================

beforeAll(async () => {
    const db = require('../config/db');
    try {
        // 1. โหลด connection pool
        dbConnection = await db.getConnection();
        
        // 2. ล้างข้อมูลผู้ใช้เก่าที่อาจค้างอยู่
        await dbConnection.query('DELETE FROM tbl_customers WHERE username = ?', [testUser.username]);
        
        // 3. Register ผู้ใช้ทดสอบ
        const res = await request(app)
            .post('/api/users/register') 
            .send(testUser);
        
        // 4. Login เพื่อรับ Token
        const loginRes = await request(app)
            .post('/api/auth/login') 
            .send({ username: testUser.username, password: testUser.password });

        authToken = loginRes.body.token;
        
        // 5. ดึง customer_id
        const [rows] = await dbConnection.query('SELECT customer_id FROM tbl_customers WHERE username = ?', [testUser.username]);
        testCustomerId = rows[0].customer_id;
        
    } catch (error) {
        console.error('Error during beforeAll setup:', error);
        throw error; 
    } finally {
        if (dbConnection) dbConnection.release(); // คืน connection
    }
});

afterAll(async () => {
    const db = require('../config/db');
    let cleanupConn;
    try {
        cleanupConn = await db.getConnection();
        // 1. ลบผู้ใช้ทดสอบทิ้งหลังจากจบการทดสอบ
        await cleanupConn.query('DELETE FROM tbl_customers WHERE customer_id = ?', [testCustomerId]);
    } catch (error) {
        console.error('Error during afterAll cleanup:', error);
    } finally {
        if (cleanupConn) cleanupConn.release();
        
        // 2. ปิด server (FIX Open Handle)
        if (app.server) {
            await new Promise(resolve => app.server.close(resolve));
        }
        
        // 3. ปิด DB Connection Pool (FIX getConnection Error ในบางครั้ง)
        await db.end();
    }
});


// ==========================================
// TEST CASES
// ==========================================

    // --- TEST: Register API ---

    it('TCRB: Should reject registration if username already exists', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send(testUser); 
        expect(res.statusCode).toBe(409); 
        expect(res.body.success).toBe(false);
    });
    
    // (*** ต้องเพิ่ม Test Cases อื่นๆ ที่นี่ ***)

    // ตัวอย่าง Test Case (Get Profile)
    it('TCR_PROFILE: Should get profile data successfully', async () => {
        const res = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.username).toBe(testUser.username);
        // ตรวจสอบว่าคีย์ที่ส่งกลับมาเป็น first_name
        expect(res.body.data.first_name).toBe(testUser.first_name); 
    });
    
    describe('User Module Integration Test', () => {

    // -------------------------------------
    // 1. การทดสอบ Register API (สาธารณะ)
    // -------------------------------------
    
    // TC1: ปฏิเสธการลงทะเบียนหาก Username ซ้ำ
    it('TC1: Should reject registration if username already exists', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send(testUser); // ใช้ testUser เดิม
            
        expect(res.statusCode).toBe(409); 
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch('Username นี้ถูกใช้งานแล้ว');
    });

    // TC2: ปฏิเสธการลงทะเบียนหาก Email ซ้ำ
    it('TC2: Should reject registration if email already exists', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send({ ...testUser, username: 'another_user' }); // เปลี่ยน username ให้ไม่ซ้ำ แต่ email ซ้ำ
            
        expect(res.statusCode).toBe(409); 
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch('Email นี้ถูกใช้งานแล้ว');
    });
    
    // TC3: ปฏิเสธการลงทะเบียนหากขาดข้อมูลที่จำเป็น (เช่น password)
    it('TC3: Should reject registration if essential data is missing (e.g., password)', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send({ ...testUser, password: '' }); // ส่ง password ว่างไป
            
        expect(res.statusCode).toBe(400); 
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch('กรุณากรอก username, password และ email');
    });


    // -------------------------------------
    // 2. การทดสอบ Login API (สาธารณะ)
    // -------------------------------------

    // TC4: ปฏิเสธการ Login หาก Password ผิด
    it('TC4: Should reject login with incorrect password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: testUser.username, password: 'WrongPassword' });
            
        expect(res.statusCode).toBe(401); 
        expect(res.body.success).toBe(false);
    });

    // TC5: เข้าสู่ระบบสำเร็จและได้รับ Token
    it('TC5: Should successfully login and receive an authentication token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: testUser.username, password: testUser.password });
            
        expect(res.statusCode).toBe(200); 
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('token'); // ตรวจสอบว่ามี token ส่งกลับมา
    });


    // -------------------------------------
    // 3. การทดสอบ Profile API (ต้องใช้ Token)
    // -------------------------------------

    // TC6: ดึงข้อมูลโปรไฟล์สำเร็จ
it('TC6: Should get profile data successfully using the token', async () => {
    const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    // ✅ แก้ไข: ตรวจสอบคุณสมบัติสำคัญเท่านั้น ไม่ใช่ Object ทั้งก้อน
    expect(res.body.data).toHaveProperty('customer_id', testCustomerId);
    expect(res.body.data).toHaveProperty('username', testUser.username);
    // ข้อมูลที่เพิ่งลงทะเบียน ควรเป็นชื่อเดิมก่อนอัพเดทใน TC7
    expect(res.body.data).toHaveProperty('first_name', testUser.first_name); 
    
    // ตรวจสอบโครงสร้างทั้งหมด
    expect(res.body.data).toHaveProperty('last_name');
    expect(res.body.data).toHaveProperty('email');
});
    
    // TC7: อัพเดทข้อมูลโปรไฟล์สำเร็จ
    it('TC7: Should update profile data successfully', async () => {
        const res = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedTestUser);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        
        // ตรวจสอบการอัพเดทด้วยการเรียก GET profile อีกครั้ง
        const checkRes = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`);
            
        expect(checkRes.body.data.email).toBe(updatedTestUser.email);
        expect(checkRes.body.data.first_name).toBe(updatedTestUser.first_name);
    });

    // TC8: ปฏิเสธการเข้าถึงเมื่อไม่มี Token
    it('TC8: Should reject access to profile if no token is provided', async () => {
        const res = await request(app)
            .get('/api/users/profile'); // ไม่ส่ง Header Authorization
            
        expect(res.statusCode).toBe(401); 
        expect(res.body.success).toBe(false);
    });


    // -------------------------------------
    // 4. การทดสอบ Admin Function (สมมติว่าเป็น Admin Function)
    // -------------------------------------
    
    // TC9: ดึงข้อมูลลูกค้าตาม ID สำเร็จ
    it('TC9: Should get customer data by ID successfully', async () => {
        const res = await request(app)
            .get(`/api/users/${testCustomerId}`) // ใช้ ID ที่ได้จาก beforeAll
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.customer_id).toBe(testCustomerId);
    });

    // TC10: ปฏิเสธการลบผู้ใช้เมื่อไม่มี Token
    it('TC10: Should reject deleting a user if no token is provided', async () => {
        const res = await request(app)
            .delete(`/api/users/${testCustomerId}`); // ไม่ส่ง Header Authorization
            
        expect(res.statusCode).toBe(401); 
        expect(res.body.success).toBe(false);
    });

});