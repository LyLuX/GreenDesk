import { createEnvironment } from '../src/config/env.js';

const productionEnvironment = {
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_HOST: 'database.internal',
  DATABASE_PORT: '3306',
  DATABASE_NAME: 'greendesk',
  DATABASE_USER: 'greendesk',
  DATABASE_PASSWORD: 'a-production-database-password',
  DATABASE_LOGGING: 'false',
  CORS_ORIGINS: 'https://greendesk.example.com, https://admin.greendesk.example.com',
  JWT_SECRET: 'a-secure-production-secret-with-more-than-32-bytes',
  JWT_ACCESS_TOKEN_TTL: '15m',
};

describe('runtime environment configuration', () => {
  it('accepts an explicit production configuration without sensitive defaults', () => {
    expect(createEnvironment(productionEnvironment)).toMatchObject({
      nodeEnv: 'production',
      port: 3000,
      database: {
        host: 'database.internal',
        port: 3306,
        name: 'greendesk',
        user: 'greendesk',
        password: 'a-production-database-password',
        logging: false,
      },
      corsOrigins: ['https://greendesk.example.com', 'https://admin.greendesk.example.com'],
      apiDocs: { enabled: false },
      trustedProxies: false,
      auth: { publicRegistrationEnabled: false },
      jwt: {
        secret: 'a-secure-production-secret-with-more-than-32-bytes',
        accessTokenTtl: '15m',
      },
    });
  });

  it.each([undefined, '', 'staging'])('rejects an absent or unknown NODE_ENV (%s)', (nodeEnv) => {
    expect(() =>
      createEnvironment({ NODE_ENV: nodeEnv, JWT_SECRET: 'development-secret' }),
    ).toThrow(/NODE_ENV/);
  });

  it('requires a JWT secret outside the test environment', () => {
    expect(() => createEnvironment({ NODE_ENV: 'development' })).toThrow(
      /JWT_SECRET est obligatoire/,
    );
  });

  it('provides isolated, non-production defaults during tests', () => {
    expect(createEnvironment({ NODE_ENV: 'test' })).toMatchObject({
      nodeEnv: 'test',
      corsOrigins: ['http://localhost:5173'],
      apiDocs: { enabled: true },
      auth: { publicRegistrationEnabled: true },
      rateLimit: {
        enabled: true,
        api: { limit: 500 },
        login: { limit: 10 },
        register: { limit: 5 },
        refresh: { limit: 30 },
      },
      jwt: { secret: 'test-only-greendesk-secret-never-used-outside-tests' },
    });
  });

  it('rejects missing production database credentials and public origin', () => {
    expect(() =>
      createEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: productionEnvironment.JWT_SECRET,
      }),
    ).toThrow(/DATABASE_HOST est obligatoire[\s\S]*CORS_ORIGINS est obligatoire/);
  });

  it('rejects the example database password in production', () => {
    expect(() =>
      createEnvironment({
        ...productionEnvironment,
        DATABASE_PASSWORD: 'replace-with-a-local-database-password',
      }),
    ).toThrow(/DATABASE_PASSWORD ne peut pas reprendre une valeur d’exemple/);
  });

  it.each(['short-secret', 'development-only-secret-change-me'])(
    'rejects an unsafe production JWT secret',
    (jwtSecret) => {
      expect(() => createEnvironment({ ...productionEnvironment, JWT_SECRET: jwtSecret })).toThrow(
        /JWT_SECRET doit contenir au moins 32 octets/,
      );
    },
  );

  it('rejects wildcard and malformed origins', () => {
    expect(() => createEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: '*' })).toThrow(
      /CORS_ORIGINS ne peut pas contenir "\*"/,
    );
    expect(() =>
      createEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: 'https://example.com/path' }),
    ).toThrow(/Chaque valeur de CORS_ORIGINS doit être une origine HTTP\(S\) sans chemin/);
    expect(() =>
      createEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: 'https://example.com,' }),
    ).toThrow(/CORS_ORIGINS doit contenir une liste d’origines sans valeur vide/);
  });

  it('normalizes, deduplicates and supports the legacy single-origin variable', () => {
    expect(
      createEnvironment({
        NODE_ENV: 'test',
        CORS_ORIGINS: 'https://EXAMPLE.com/, https://example.com',
      }).corsOrigins,
    ).toEqual(['https://example.com']);
    expect(
      createEnvironment({ NODE_ENV: 'test', CORS_ORIGIN: 'https://legacy.example.com' })
        .corsOrigins,
    ).toEqual(['https://legacy.example.com']);
  });

  it('rejects ambiguous CORS variables', () => {
    expect(() =>
      createEnvironment({
        NODE_ENV: 'test',
        CORS_ORIGINS: 'https://one.example.com',
        CORS_ORIGIN: 'https://two.example.com',
      }),
    ).toThrow(/CORS_ORIGINS et CORS_ORIGIN ne peuvent pas être définies ensemble/);
    expect(() =>
      createEnvironment({
        NODE_ENV: 'test',
        CORS_ORIGIN: 'https://one.example.com,https://two.example.com',
      }),
    ).toThrow(/CORS_ORIGIN accepte une seule origine/);
  });

  it('rejects malformed ports and boolean flags', () => {
    expect(() =>
      createEnvironment({
        NODE_ENV: 'test',
        PORT: '0',
        DATABASE_PORT: 'invalid',
        DATABASE_LOGGING: 'yes',
      }),
    ).toThrow(/PORT doit être[\s\S]*DATABASE_PORT doit être[\s\S]*DATABASE_LOGGING doit valoir/);
  });

  it('accepts only explicit trusted proxy addresses or subnets', () => {
    expect(
      createEnvironment({
        NODE_ENV: 'test',
        TRUSTED_PROXIES: 'loopback, 10.0.0.0/8',
      }).trustedProxies,
    ).toEqual(['loopback', '10.0.0.0/8']);
    expect(() => createEnvironment({ NODE_ENV: 'test', TRUSTED_PROXIES: 'true' })).toThrow(
      /TRUSTED_PROXIES doit lister explicitement/,
    );
  });

  it('validates public registration and rate-limit settings', () => {
    expect(
      createEnvironment({
        NODE_ENV: 'test',
        PUBLIC_REGISTRATION_ENABLED: 'false',
        RATE_LIMIT_ENABLED: 'false',
        RATE_LIMIT_LOGIN_MAX: '4',
      }),
    ).toMatchObject({
      auth: { publicRegistrationEnabled: false },
      rateLimit: { enabled: false, login: { limit: 4 } },
    });
    expect(() => createEnvironment({ NODE_ENV: 'test', RATE_LIMIT_LOGIN_MAX: '0' })).toThrow(
      /RATE_LIMIT_LOGIN_MAX doit être un entier strictement positif/,
    );
  });

  it('never includes credential values in validation errors', () => {
    const databasePassword = 'do-not-log-this-database-password';
    const jwtSecret = 'do-not-log-this-production-jwt-secret-value';
    let validationError;

    try {
      createEnvironment({
        ...productionEnvironment,
        DATABASE_PASSWORD: databasePassword,
        JWT_SECRET: jwtSecret,
        PORT: 'invalid',
      });
    } catch (error) {
      validationError = error;
    }

    expect(validationError).toBeInstanceOf(Error);
    expect(validationError.message).not.toContain(databasePassword);
    expect(validationError.message).not.toContain(jwtSecret);
  });
});
