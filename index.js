const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// โหลดค่าจากไฟล์ .env
dotenv.config();

const { swaggerUi, specs } = require('./swagger');

// นำเข้า Routes
const userRoutes = require('./Routes/users');
const registerRoutes = require('./Routes/register');
const loginRoutes = require('./Routes/login');

const app = express();

// --- Middleware ---
app.use(cors()); // อนุญาตให้ Frontend ข้ามโดเมนมาดึงข้อมูลได้
app.use(express.json()); // ให้ Server อ่านข้อมูลแบบ JSON ได้

// --- Swagger UI ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// --- API Routes ---
app.use('/api/users', userRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/login', loginRoutes);

// --- Server Setup ---
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
    });
}

module.exports = app;