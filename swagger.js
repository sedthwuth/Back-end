const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BackEnd API',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
  },
  apis: ['./Routes/*.js'], // หรือ ./routes/*.js ให้ตรงโฟลเดอร์
};

const specs = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  specs,
};
