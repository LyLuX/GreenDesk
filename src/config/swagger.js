import swaggerJsdoc from 'swagger-jsdoc';

/** OpenAPI document generated from route JSDoc annotations. */
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'GreenDesk API',
      version: '1.0.0',
      description: 'GreenDesk backend API documentation.',
    },
    servers: [{ url: '/api/v1', description: 'Version 1 API' }],
    tags: [{ name: 'System', description: 'System endpoints' }],
  },
  apis: ['./src/routes/**/*.js'],
});

export default swaggerSpec;
