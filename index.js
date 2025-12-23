// ใน index.js

require('dotenv').config();
const express = require('express');
// 💡 แก้ไข Swagger Import:
const swaggerUi = require('swagger-ui-express'); // Import swagger-ui-express โดยตรง
const { specs } = require("./swagger.js"); 

const app = express();
app.use(express.json());

// ... (Routes) ...
app.use("/api/users", require("./routes/users.js"));
app.use("/api/login", require("./routes/login.js"));

// Middleware Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs)); 

// 💡 1. EXPORT APP OBJECT: ส่ง Express App Object ออกไปเสมอ
module.exports = app; 

const PORT = process.env.PORT || 3000;

// 💡 2. เงื่อนไขการ LISTEN:
// Server จะ listen ก็ต่อเมื่อไฟล์นี้ถูกรันโดยตรง (ไม่ถูก require) 
// หรือเมื่อเราไม่ได้อยู่ในโหมด Test
if (require.main === module || process.env.NODE_ENV === 'production') {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}   