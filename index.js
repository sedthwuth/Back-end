const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { swaggerUi, specs } = require('./swagger');

// Routes
const userRoutes = require('./Routes/users');
const registerRoutes = require('./Routes/register');
const loginRoutes = require('./Routes/login');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/login', loginRoutes);

module.exports = app;

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () =>
        console.log(`Server running on http://localhost:${PORT}`)
    );
}
