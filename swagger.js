const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BackEnd API",
      version: "1.0.0",
      description: "API Documentation",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
  },
  apis: [path.join(__dirname, "/Routes/*.js")], // ✅ แก้ตรงนี้
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
