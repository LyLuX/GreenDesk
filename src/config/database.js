import { Sequelize } from 'sequelize';

import env from './env.js';
import logger from '../core/logger/logger.js';

/**
 * Sequelize connection shared by application modules.
 * Models will be registered against this instance when business modules are added.
 *
 * @type {Sequelize}
 */
const sequelize = new Sequelize(env.database.name, env.database.user, env.database.password, {
  host: env.database.host,
  port: env.database.port,
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4'
  },
  timezone: '+00:00',
  logging: env.database.logging ? (message) => logger.debug(message) : false,
  define: {
    underscored: true,
    timestamps: true,
    freezeTableName: true,
    paranoid: true
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

/**
 * Checks that MySQL is reachable with the configured credentials.
 *
 * @returns {Promise<void>}
 */
export async function connectDatabase() {
  await sequelize.authenticate();
  logger.info('MySQL connection established');
}

export default sequelize;
