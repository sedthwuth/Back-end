const mysql = require('mysql2/promise');
require('dotenv').config();

const configdb = {
    // 💡 หาก .env ไม่ได้กำหนดค่า จะใช้ค่า Default ที่คุณระบุ
    host: process.env.DB_HOST || '49.229.108.173',
    // สำคัญ: ต้องแน่ใจว่าค่าใน .env เป็นตัวเลขที่ถูกต้อง
    port: parseInt(process.env.DB_PORT) || 3308, 
    user: process.env.DB_USER || 'it68a',
    password: process.env.DB_PASS || 'it68a@2025',
    database: process.env.DB_NAME || 'db_68319010028',
    
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // เพิ่ม Timeout เป็น 30 วินาที (30000 มิลลิวินาที) เพื่อแก้ปัญหา ETIMEDOUT
    connectTimeout: 30000 
};

// สร้าง Connection Pool
const pool = mysql.createPool(configdb); 

// ทดสอบการเชื่อมต่อ
pool.getConnection()
.then(connection => {
    console.log(`✅ เชื่อมต่อฐานข้อมูลสำเร็จ: ${configdb.database} (Host: ${configdb.host}:${configdb.port})`);
    connection.release();
})
.catch(err => {
    // โค้ดจะมาถึงตรงนี้เมื่อเกิด ETIMEDOUT หรือ Connection Error อื่นๆ
    console.error("❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้:", err.message);
});

// ✅ ส่งออก pool object เพื่อให้ Express และ Test files นำไปใช้งาน
module.exports = pool;