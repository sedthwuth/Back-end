const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const options = {
    definition: {
        openapi: '3.0.0', // กำหนดเวอร์ชันของ OpenAPI
        info: {
            title: 'E-commerce API Documentation', // ชื่อโปรเจกต์
            version: '1.0.0',
            description: 'API documentation for Users, Orders, and Authentication.',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                // กำหนดรูปแบบการใช้ Token
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                // กำหนดให้ทุก API ใช้ JWT Token เป็นค่าเริ่มต้น
                bearerAuth: [] 
            }
        ]   
    },
   // ...
  apis: [path.join(__dirname, "/routes/*.js")], // path ไฟล์ที่มี comment swagger
};

const specs = swaggerJsdoc(options);

// 💡 ต้อง Export เป็น Object ที่มี key และ value ที่ตรงกัน
module.exports = {
    swaggerUi,
    specs
};