import dotenv from 'dotenv';

dotenv.config();

/**
 * Runtime environment configuration.
 * Values are read once during startup to keep configuration predictable.
 *
 * @type {{nodeEnv: string, port: number, database: object, corsOrigin: string}}
 */
const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appVersion: process.env.npm_package_version ?? '1.0.0',
  port: Number(process.env.PORT ?? 3000),
  database: {
    host: process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    name: process.env.DATABASE_NAME ?? 'greendesk',
    user: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? '',
    logging: process.env.DATABASE_LOGGING === 'true',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};

export default env;
