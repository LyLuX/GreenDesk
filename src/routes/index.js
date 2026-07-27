import { Router } from 'express';

import { successResponse } from '../core/responses/api-response.js';

const router = Router();

router.get('/', (_request, response) => {
  response.json(successResponse({ name: 'GreenDesk API', version: 'v1' }));
});

export default router;
