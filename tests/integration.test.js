const request = require("supertest");
const app = require("../index"); 

describe("Full Cycle Integration Test (12 Test Cases)", () => {
    
    let authToken = "";
    let createdOrderId = 0;
    
    const randomNum = Date.now();
    // ตัวแปรที่ประกาศชื่อ testUser (ไม่มี s)
    const testUser = {
        username: `user_${randomNum}`,
        password: "password123",
        first_name: "Test",
        last_name: "Bot",
        address: "Test Lab",
        phone: "0812345678",
        email: `test_${randomNum}@mail.com`
    };

    // --- ส่วน AUTHENTICATION ---

    test("TC01: สมัครสมาชิกสำเร็จ (Register Success)", async () => {
        // ✅ แก้ไข: testUsers -> testUser
        const res = await request(app).post("/auth/register").send(testUser);
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Register successful");
        
    });

    test("TC02: สมัครสมาชิกชื่อซ้ำ (Register Duplicate)", async () => {
        // ✅ แก้ไข: testUsers -> testUser
        const res = await request(app).post("/auth/register").send(testUser);
        expect(res.statusCode).toBe(400); 
        // ✅ แก้ไขการคาดหวัง: "Username already exists"
        expect(res.body.error).toBe("Username already exists");
    });

    test("TC03: เข้าสู่ระบบสำเร็จ (Login Success)", async () => {
        const res = await request(app).post("/auth/login").send({
            // ✅ แก้ไข: testUsers.usersname -> testUser.username
            username: testUser.username,
            password: testUser.password
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("token");
        
        authToken = res.body.token; 
    });

    test("TC04: เข้าสู่ระบบรหัสผิด (Login Fail)", async () => {
        const res = await request(app).post("/auth/login").send({
            // ✅ แก้ไข: testUsers.usersname -> testUser.username
            username: testUser.username,
            password: "wrong_password"
        });
        expect(res.statusCode).toBe(401);
    });

    // --- ส่วน USER MANAGEMENT ---

    test("TC05: ดึงข้อมูลลูกค้าแบบมี Token (Get Customers with Token)", async () => {
        const res = await request(app)
            .get("/customers")
            .set("Authorization", `Bearer ${authToken}`); 
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true); 
    });

    test("TC06: ดึงข้อมูลลูกค้าแบบไม่มี Token (Get Customers No Token)", async () => {
        const res = await request(app).get("/customers");
        expect(res.statusCode).toBe(401); 
    });

    test("TC07: แก้ไขข้อมูลส่วนตัว (Update Profile)", async () => {
        const res = await request(app)
            .put("/customers/me")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                first_name: "UpdatedName",
                phone: "0999999999"
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Profile updated successfully");
    });

    // --- ส่วน ORDER MANAGEMENT ---

    test("TC08: ดึงรายการเมนู (Get Menus)", async () => {
        const res = await request(app).get("/menus");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("TC09: สั่งอาหารสำเร็จ (Create Order Success)", async () => {
        const res = await request(app)
            .post("/orders")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                restaurant_id: 1,
                menu_id: 1, 
                quantity: 2
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("total_price");
        
        createdOrderId = res.body.order_id; 
    });

    test("TC10: สั่งอาหารเมนูที่ไม่มีจริง (Create Order Fail)", async () => {
        const res = await request(app)
            .post("/orders")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                restaurant_id: 1,
                menu_id: 9999, // เมนูที่ไม่มีจริง
                quantity: 1
            });
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe("Menu not found");
    });

    test("TC12: ดูยอดรวม (Order Summary)", async () => {
        const res = await request(app)
            .get("/orders/summary")
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("total_amount");
    });
    
    test("TC11: ยกเลิกคำสั่งซื้อ (Delete Order)", async () => {
        const res = await request(app)
            .delete(`/orders/${createdOrderId}`) 
            .set("Authorization", `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Order cancelled successfully");
    });
});