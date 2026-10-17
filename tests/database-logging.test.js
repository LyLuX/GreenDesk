import { jest } from '@jest/globals';
import { Sequelize } from 'sequelize';
import { createDatabaseLoggingOptions } from '../src/core/logger/database-logging.js';
import { redactLogRecord } from '../src/core/logger/redact-log.js';

const secret = 'DB_LOG_FAKE_SECRET';
const setup = (nodeEnv = 'development', enabled = true) => {
  const logger = { debug: jest.fn() };
  return {
    logger,
    options: createDatabaseLoggingOptions({ nodeEnv, database: { logging: enabled } }, logger),
  };
};

describe('database logging environment boundary', () => {
  it.each(['development', 'production', 'test'])('does not log when disabled in %s', (nodeEnv) => {
    expect(setup(nodeEnv, false).options).toEqual({ logging: false });
  });

  it.each(['production', 'test'])(
    'preserves the exact existing callback and options in %s',
    (nodeEnv) => {
      const { options, logger } = setup(nodeEnv);
      expect(Object.keys(options)).toEqual(['logging']);
      options.logging(`SELECT '${secret}'`, 25, { parameters: [secret] });
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith('Database statement executed', {
        event: 'database.statement',
      });
    },
  );

  it('logs the normalized statement and elapsed time only in development', () => {
    const { options, logger } = setup();
    expect(options).toMatchObject({ benchmark: true, logQueryParameters: false });
    options.logging(
      `Executed (transaction-id): SELECT \x60id\x60 FROM \x60materials\x60 WHERE \x60name\x60 = '${secret}' AND \x60id\x60 = 42;`,
      8,
    );
    const details = logger.debug.mock.calls[0][1];
    expect(details).toEqual({
      event: 'database.statement',
      operation: 'SELECT',
      statement:
        'SELECT \x60id\x60 FROM \x60materials\x60 WHERE \x60name\x60 = ? AND \x60id\x60 = ?',
      durationMs: 8,
    });
    expect(redactLogRecord({ ...details })).toEqual(details);
    expect(JSON.stringify(details)).not.toContain(secret);
  });

  it.each([
    `SELECT '${secret}', "${secret}" FROM materials`,
    `INSERT INTO materials (name) VALUES ('${secret}''quoted')`,
    String.raw`UPDATE materials SET name = '${secret}\'quoted' WHERE id = 1`,
    `SELECT X'DEADBEEF', B'101', _utf8mb4'${secret}' FROM materials`,
    `SELECT id FROM materials /* ${secret} */ WHERE active = TRUE -- ${secret}\n`,
    `SELECT id FROM materials # ${secret}\n WHERE name = '${secret}'`,
    `SELECT id FROM materials WHERE id = $1; ${JSON.stringify({ bind: [secret] })}`,
    `SELECT id FROM materials WHERE id = :boundValue; '${secret}'`,
    `SELECT id FROM materials WHERE amount = -123.45e+6 AND data = 0xDEADBEEF AND active = FALSE AND name IS NULL`,
  ])('masks values and comments for %s', (sql) => {
    const { options, logger } = setup();
    options.logging(sql, 3, { parameters: [secret], sql });
    const details = logger.debug.mock.calls[0][1];
    expect(details.statement).not.toBe('[REDACTED]');
    expect(JSON.stringify(details)).not.toMatch(/DB_LOG_FAKE_SECRET|DEADBEEF|123\.45|boundValue/);
    expect(details).not.toHaveProperty('parameters');
    expect(details.statement).toContain('?');
  });

  it.each([
    `SELECT '${secret}`,
    `SELECT id /* ${secret}`,
    `UNKNOWN ${secret}`,
    `SELECT [${secret}]`,
    null,
    { sql: secret },
    'SELECT ' + 'x'.repeat(65536),
  ])('fully masks unsupported or malformed statements (%#)', (sql) => {
    const { options, logger } = setup();
    options.logging(sql, 1);
    expect(logger.debug.mock.calls[0][1]).toEqual({
      event: 'database.statement',
      operation: 'UNKNOWN',
      statement: '[REDACTED]',
      durationMs: 1,
    });
  });

  it.each([undefined, {}, -1, Infinity])('ignores invalid duration metadata (%#)', (duration) => {
    const { options, logger } = setup();
    options.logging('SELECT 1', duration);
    expect(logger.debug.mock.calls[0][1]).not.toHaveProperty('durationMs');
  });

  it.each(['development', 'production', 'test'])(
    'preserves Sequelize callback timing and payloads in %s without opening a connection',
    async (nodeEnv) => {
      const { options, logger } = setup(nodeEnv);
      const sequelize = new Sequelize('test', 'test', 'test', { dialect: 'mysql', ...options });
      try {
        const finish = sequelize.dialect.Query.prototype._logQuery.call(
          { sequelize, connection: { uuid: 'transaction' }, options: {} },
          `SELECT '${secret}' AS result`,
          () => {},
          [secret],
        );
        if (nodeEnv === 'development') {
          expect(logger.debug).not.toHaveBeenCalled();
          finish();
          expect(logger.debug).toHaveBeenCalledTimes(1);
          expect(logger.debug.mock.calls[0][1]).toMatchObject({
            operation: 'SELECT',
            statement: 'SELECT ? AS result',
            durationMs: expect.any(Number),
          });
        } else {
          expect(logger.debug).toHaveBeenCalledTimes(1);
          expect(logger.debug).toHaveBeenCalledWith('Database statement executed', {
            event: 'database.statement',
          });
          finish();
          expect(logger.debug).toHaveBeenCalledTimes(1);
        }
      } finally {
        await sequelize.close();
      }
    },
  );
});
