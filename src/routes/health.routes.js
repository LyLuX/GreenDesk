import { Router } from 'express';

import HTTP_STATUS from '../core/constants/http-status.js';
import { successResponse } from '../core/responses/api-response.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Returns the API health status.
 *     responses:
 *       200:
 *         description: API is running.
 */
router.get('/', (request, response) => {
  response.status(HTTP_STATUS.OK).json(
    successResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      requestId: request.id,
    }),
  );
});

export default router;
