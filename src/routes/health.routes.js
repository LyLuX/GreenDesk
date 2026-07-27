import { Router } from 'express';

import sequelize from '../config/database.js';
import HTTP_STATUS from '../core/constants/http-status.js';
import env from '../config/env.js';

const router = Router();

router.get('/', async (_request, response) => {
  let databaseStatus = 'UP';

  try {
    await sequelize.authenticate();
  } catch {
    databaseStatus = 'DOWN';
  }

  const isHealthy = databaseStatus === 'UP';
  response.status(isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE).json({
    status: isHealthy ? 'UP' : 'DOWN',
    database: databaseStatus,
    uptime: Math.floor(process.uptime()),
    version: env.appVersion,
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

export default router;
