import { Router } from 'express';

import env from '../config/env.js';
import { successResponse } from '../core/responses/api-response.js';

const router = Router();

router.get('/', (_request, response) => {
  response.json(
    successResponse({ name: 'GreenDesk API', version: 'v1', uploadLimits: env.uploads }),
  );
});

export default router;
