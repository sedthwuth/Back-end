const mysql = require('mysql2/promise');
require('dotenv').config();

const configdb = {
    host: process.env.DB_HOST || '49.229.108.173',
    // สำคัญ: ต้องแน่ใจว่าค่าใน .env เป็นตัวเลขที่ถูกต้อง
    port: parseInt(process.env.DB_PORT) || 3308, 
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'it68a@2025',
    database: process.env.DB_NAME || 'db_food_68319010028',
    
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000 
};

const pool = mysql.createPool(configdb); // หรือ mysql.createPool(configdb)

// ส่วนที่ต้องแก้ไขให้ถูกต้องคือ
pool.getConnection()
.then(connection => {
    console.log(`✅ เชื่อมต่อฐานข้อมูลสำเร็จ: ${configdb.database} (Host: ${configdb.host}:${configdb.port})`);
    connection.release();
})
.catch(err => {
    console.error("❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้:", err.message);
    // ไม่ต้อง module.exports = pool; ตรงนี้
});

// ✅ FIX 3: ต้องส่งออก 'pool' ซึ่งเป็นตัว object หลัก
module.exports = pool;