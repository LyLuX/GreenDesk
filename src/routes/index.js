import { Router } from 'express';

import { successResponse } from '../core/responses/api-response.js';

const router = Router();

/**
 * @openapi
 * /api/v1:
 *   get:
 *     tags: [System]
 *     summary: Returns the API version entry point.
 *     responses:
 *       200:
 *         description: API entry point information.
 */
router.get('/', (_request, response) => {
  response.json(successResponse({ name: 'GreenDesk API', version: 'v1' }));
});

export default router;
