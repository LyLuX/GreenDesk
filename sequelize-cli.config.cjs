require('dotenv').config();

/**
 * Builds a Sequelize CLI configuration from the same environment variables as the
 * application runtime. The test database can be overridden independently.
 *
 * @param {string} database Database name for the target environment.
 * @param {boolean} logging Whether SQL logging is enabled.
 * @returns {object} Sequelize CLI configuration.
 */
function createConfiguration(database, logging) {
  return {
    dialect: 'mysql',
    host: process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    database,
    username: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? '',
    logging,
    dialectOptions: {
      charset: 'utf8mb4',
    },
    timezone: '+00:00',
    define: {
      charset: 'utf8mb4',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
      paranoid: true,
    },
  };
}

const databaseName = process.env.DATABASE_NAME ?? 'greendesk';
const logging = process.env.DATABASE_LOGGING === 'true';

/** @type {{development: object, test: object, production: object}} */
module.exports = {
  development: createConfiguration(databaseName, logging),
  test: createConfiguration(process.env.TEST_DATABASE_NAME ?? `${databaseName}_test`, false),
  production: createConfiguration(databaseName, false),
};
