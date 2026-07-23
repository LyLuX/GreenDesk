import app from './app.js';
import env from './config/env.js';
import sequelize, { connectDatabase } from './config/database.js';
import { initializeModels } from './core/database/models.js';
import logger from './core/logger/logger.js';

/** Starts HTTP only after the MySQL connection has been verified. */
async function startServer() {
  try {
    await connectDatabase();
    initializeModels();
    if (env.nodeEnv === 'development') {
      await sequelize.sync();
    }
    app.listen(env.port, () => {
      logger.info(`GreenDesk API listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error('Unable to start GreenDesk API', { stack: error.stack });
    process.exit(1);
  }
}

startServer();
