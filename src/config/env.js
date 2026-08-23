import dotenv from 'dotenv';
import appVersion from './app-version.js';

dotenv.config();

const NODE_ENVIRONMENTS = new Set(['development', 'test', 'production']);
const SMTP_AUTH_TYPES = new Set(['none', 'password', 'oauth2']);
const PRODUCTION_REQUIRED_DATABASE_KEYS = [
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
];
const UNSAFE_PRODUCTION_SECRETS = new Set([
  'development-only-secret-change-me',
  'replace-with-at-least-32-random-characters',
  'changeme',
]);
const UNSAFE_PRODUCTION_DATABASE_PASSWORDS = new Set([
  'replace-with-a-local-database-password',
  'changeme',
]);

const normalizedValue = (source, key) => {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
};

const parsePort = (source, key, fallback, errors) => {
  const rawValue = normalizedValue(source, key);
  const value = rawValue ? Number(rawValue) : fallback;
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    errors.push(`${key} doit être un entier compris entre 1 et 65535.`);
  }
  return value;
};

const parseBoolean = (source, key, fallback, errors) => {
  const rawValue = normalizedValue(source, key);
  if (!rawValue) return fallback;
  if (!['true', 'false'].includes(rawValue)) {
    errors.push(`${key} doit valoir "true" ou "false".`);
  }
  return rawValue === 'true';
};

const parsePositiveInteger = (source, key, fallback, errors) => {
  const rawValue = normalizedValue(source, key);
  const value = rawValue ? Number(rawValue) : fallback;
  if (!Number.isInteger(value) || value < 1) {
    errors.push(`${key} doit être un entier strictement positif.`);
  }
  return value;
};

const parseOptionalPositiveInteger = (source, key, errors) => {
  const rawValue = normalizedValue(source, key);
  if (!rawValue) return null;
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1) {
    errors.push(`${key} doit être un entier strictement positif.`);
  }
  return value;
};

const parseOptionalHttpUrl = (source, key, isProduction, errors) => {
  const rawValue = normalizedValue(source, key);
  if (!rawValue) return '';
  try {
    const url = new URL(rawValue);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('Invalid URL');
    }
    if (isProduction && url.protocol !== 'https:') {
      errors.push(`${key} doit utiliser HTTPS en production.`);
    }
    return url.toString();
  } catch {
    errors.push(`${key} doit être une URL HTTP(S) valide.`);
    return '';
  }
};

const parseTrustedProxies = (source, errors) => {
  const rawValue = normalizedValue(source, 'TRUSTED_PROXIES');
  if (!rawValue || rawValue === 'false') return false;
  if (['true', '*', 'all'].includes(rawValue.toLowerCase())) {
    errors.push(
      'TRUSTED_PROXIES doit lister explicitement les adresses ou sous-réseaux des proxys fiables.',
    );
    return false;
  }
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const parseCorsOrigins = (source, isProduction, errors) => {
  const configuredOrigins = normalizedValue(source, 'CORS_ORIGINS');
  const legacyOrigin = normalizedValue(source, 'CORS_ORIGIN');
  if (configuredOrigins && legacyOrigin) {
    errors.push('CORS_ORIGINS et CORS_ORIGIN ne peuvent pas être définies ensemble.');
  }
  if (legacyOrigin.includes(',')) {
    errors.push('CORS_ORIGIN accepte une seule origine ; utilisez CORS_ORIGINS pour une liste.');
  }

  const rawValue =
    configuredOrigins || legacyOrigin || (isProduction ? '' : 'http://localhost:5173');
  if (!rawValue) {
    errors.push('CORS_ORIGINS est obligatoire en production.');
    return [];
  }

  const rawOrigins = rawValue.split(',').map((value) => value.trim());
  if (rawOrigins.some((value) => !value)) {
    errors.push('CORS_ORIGINS doit contenir une liste d’origines sans valeur vide.');
  }

  const origins = [];
  for (const rawOrigin of rawOrigins.filter(Boolean)) {
    if (rawOrigin === '*') {
      errors.push('CORS_ORIGINS ne peut pas contenir "*".');
      continue;
    }

    try {
      const origin = new URL(rawOrigin);
      if (
        !['http:', 'https:'].includes(origin.protocol) ||
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash
      ) {
        throw new Error('Invalid origin');
      }
      origins.push(origin.origin);
    } catch {
      errors.push('Chaque valeur de CORS_ORIGINS doit être une origine HTTP(S) sans chemin.');
    }
  }

  return [...new Set(origins)];
};

const parseApplicationUrl = (source, isProduction, errors) => {
  const rawValue =
    normalizedValue(source, 'APP_PUBLIC_URL') || (isProduction ? '' : 'http://localhost:5173');
  if (!rawValue) {
    errors.push('APP_PUBLIC_URL est obligatoire lorsque les emails sont activés en production.');
    return 'http://localhost:5173';
  }
  try {
    const url = new URL(rawValue);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('Invalid application URL');
    }
    if (isProduction && url.protocol !== 'https:') {
      errors.push('APP_PUBLIC_URL doit utiliser HTTPS en production.');
    }
    if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
    return url.toString();
  } catch {
    errors.push('APP_PUBLIC_URL doit être une URL HTTP(S) valide.');
    return 'http://localhost:5173';
  }
};

/**
 * Builds and validates the runtime configuration before any service starts.
 * Production deliberately has no fallback for credentials or public origins.
 *
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} source Environment variables.
 * @returns {object} Validated GreenDesk runtime configuration.
 */
export function createEnvironment(source = process.env) {
  const errors = [];
  const nodeEnv = normalizedValue(source, 'NODE_ENV');

  if (!nodeEnv) errors.push('NODE_ENV est obligatoire.');
  else if (!NODE_ENVIRONMENTS.has(nodeEnv)) {
    errors.push('NODE_ENV doit valoir "development", "test" ou "production".');
  }

  const isProduction = nodeEnv === 'production';
  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED_DATABASE_KEYS) {
      if (!normalizedValue(source, key)) errors.push(`${key} est obligatoire en production.`);
    }
    if (
      UNSAFE_PRODUCTION_DATABASE_PASSWORDS.has(
        normalizedValue(source, 'DATABASE_PASSWORD').toLowerCase(),
      )
    ) {
      errors.push('DATABASE_PASSWORD ne peut pas reprendre une valeur d’exemple en production.');
    }
  }

  const jwtSecret =
    normalizedValue(source, 'JWT_SECRET') ||
    (nodeEnv === 'test' ? 'test-only-greendesk-secret-never-used-outside-tests' : '');
  if (!jwtSecret) errors.push('JWT_SECRET est obligatoire hors environnement de test.');
  if (
    isProduction &&
    (Buffer.byteLength(jwtSecret, 'utf8') < 32 ||
      UNSAFE_PRODUCTION_SECRETS.has(jwtSecret.toLowerCase()))
  ) {
    errors.push('JWT_SECRET doit contenir au moins 32 octets et ne pas être une valeur d’exemple.');
  }

  const corsOrigins = parseCorsOrigins(source, isProduction, errors);

  const port = parsePort(source, 'PORT', 3000, errors);
  const databasePort = parsePort(source, 'DATABASE_PORT', 3306, errors);
  const databaseLogging = parseBoolean(source, 'DATABASE_LOGGING', false, errors);
  const publicRegistrationEnabled = parseBoolean(
    source,
    'PUBLIC_REGISTRATION_ENABLED',
    !isProduction,
    errors,
  );
  const mailEnabled = parseBoolean(source, 'MAIL_ENABLED', false, errors);
  const smtpHost = normalizedValue(source, 'SMTP_HOST');
  const smtpUser = normalizedValue(source, 'SMTP_USER');
  const smtpPassword = source.SMTP_PASSWORD ?? '';
  const smtpAuthType =
    normalizedValue(source, 'SMTP_AUTH_TYPE').toLowerCase() ||
    (smtpUser || smtpPassword ? 'password' : 'none');
  const smtpOauthClientId = normalizedValue(source, 'SMTP_OAUTH_CLIENT_ID');
  const smtpOauthClientSecret = source.SMTP_OAUTH_CLIENT_SECRET ?? '';
  const smtpOauthRefreshToken = source.SMTP_OAUTH_REFRESH_TOKEN ?? '';
  const smtpOauthAccessToken = source.SMTP_OAUTH_ACCESS_TOKEN ?? '';
  const smtpOauthAccessUrl = parseOptionalHttpUrl(
    source,
    'SMTP_OAUTH_ACCESS_URL',
    isProduction,
    errors,
  );
  const smtpOauthExpiresAt = parseOptionalPositiveInteger(source, 'SMTP_OAUTH_EXPIRES_AT', errors);
  const smtpOauthScope = normalizedValue(source, 'SMTP_OAUTH_SCOPE');
  const hasOauthConfiguration = Boolean(
    smtpOauthClientId ||
    smtpOauthClientSecret ||
    smtpOauthRefreshToken ||
    smtpOauthAccessToken ||
    smtpOauthAccessUrl ||
    smtpOauthExpiresAt ||
    smtpOauthScope,
  );
  const mailFromAddress = normalizedValue(source, 'MAIL_FROM_ADDRESS');
  if (mailEnabled && !smtpHost) errors.push('SMTP_HOST est obligatoire lorsque MAIL_ENABLED=true.');
  if (mailEnabled && !mailFromAddress) {
    errors.push('MAIL_FROM_ADDRESS est obligatoire lorsque MAIL_ENABLED=true.');
  }
  if (!SMTP_AUTH_TYPES.has(smtpAuthType)) {
    errors.push('SMTP_AUTH_TYPE doit valoir "none", "password" ou "oauth2".');
  }
  if (smtpAuthType === 'password' && (!smtpUser || !smtpPassword)) {
    errors.push('SMTP_USER et SMTP_PASSWORD sont obligatoires avec SMTP_AUTH_TYPE=password.');
  }
  if (smtpAuthType === 'password' && hasOauthConfiguration) {
    errors.push(
      'Les variables SMTP_OAUTH_* ne doivent pas être définies avec SMTP_AUTH_TYPE=password.',
    );
  }
  if (smtpAuthType === 'oauth2') {
    if (!smtpUser) errors.push('SMTP_USER est obligatoire avec SMTP_AUTH_TYPE=oauth2.');
    if (smtpPassword) {
      errors.push('SMTP_PASSWORD ne doit pas être défini avec SMTP_AUTH_TYPE=oauth2.');
    }
    if (smtpOauthRefreshToken && !smtpOauthAccessUrl) {
      errors.push('SMTP_OAUTH_ACCESS_URL est obligatoire avec SMTP_AUTH_TYPE=oauth2.');
    }
    if (!smtpOauthAccessToken && (!smtpOauthClientId || !smtpOauthRefreshToken)) {
      errors.push(
        'SMTP_OAUTH_ACCESS_TOKEN ou le couple SMTP_OAUTH_CLIENT_ID/SMTP_OAUTH_REFRESH_TOKEN est obligatoire avec SMTP_AUTH_TYPE=oauth2.',
      );
    }
    if (smtpOauthClientSecret && !smtpOauthClientId) {
      errors.push(
        'SMTP_OAUTH_CLIENT_ID est obligatoire lorsque SMTP_OAUTH_CLIENT_SECRET est défini.',
      );
    }
    if (smtpOauthRefreshToken && !smtpOauthClientId) {
      errors.push(
        'SMTP_OAUTH_CLIENT_ID est obligatoire lorsque SMTP_OAUTH_REFRESH_TOKEN est défini.',
      );
    }
  }
  if (smtpAuthType === 'none' && (smtpUser || smtpPassword || hasOauthConfiguration)) {
    errors.push('Aucun identifiant SMTP ne doit être défini avec SMTP_AUTH_TYPE=none.');
  }
  if (isProduction && publicRegistrationEnabled && !mailEnabled) {
    errors.push('MAIL_ENABLED doit valoir "true" lorsque l’inscription publique est active.');
  }
  const applicationUrl = parseApplicationUrl(source, isProduction && mailEnabled, errors);
  const emailVerificationTtlHours = parsePositiveInteger(
    source,
    'EMAIL_VERIFICATION_TTL_HOURS',
    24,
    errors,
  );
  const emailVerificationCooldownSeconds = parsePositiveInteger(
    source,
    'EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS',
    60,
    errors,
  );
  const smtpPort = parsePort(source, 'SMTP_PORT', 587, errors);
  const smtpSecure = parseBoolean(source, 'SMTP_SECURE', false, errors);
  const smtpUseSystemCa = parseBoolean(source, 'SMTP_USE_SYSTEM_CA', false, errors);
  const smtpPool = parseBoolean(source, 'SMTP_POOL', true, errors);
  const smtpMaxConnections = parsePositiveInteger(source, 'SMTP_MAX_CONNECTIONS', 5, errors);
  const smtpMaxMessages = parsePositiveInteger(source, 'SMTP_MAX_MESSAGES', 100, errors);
  const rateLimitEnabled = parseBoolean(source, 'RATE_LIMIT_ENABLED', true, errors);
  const trustedProxies = parseTrustedProxies(source, errors);
  const rateLimit = {
    enabled: rateLimitEnabled,
    api: {
      windowMs: 15 * 60 * 1000,
      limit: parsePositiveInteger(source, 'RATE_LIMIT_API_MAX', 500, errors),
    },
    login: {
      windowMs: 15 * 60 * 1000,
      limit: parsePositiveInteger(source, 'RATE_LIMIT_LOGIN_MAX', 10, errors),
    },
    register: {
      windowMs: 60 * 60 * 1000,
      limit: parsePositiveInteger(source, 'RATE_LIMIT_REGISTER_MAX', 5, errors),
    },
    refresh: {
      windowMs: 15 * 60 * 1000,
      limit: parsePositiveInteger(source, 'RATE_LIMIT_REFRESH_MAX', 30, errors),
    },
    emailVerification: {
      windowMs: 15 * 60 * 1000,
      limit: parsePositiveInteger(source, 'RATE_LIMIT_EMAIL_VERIFICATION_MAX', 10, errors),
    },
  };

  if (errors.length > 0) {
    throw new Error(`Configuration d’environnement invalide :\n- ${errors.join('\n- ')}`);
  }

  return {
    nodeEnv,
    appVersion: normalizedValue(source, 'npm_package_version') || appVersion,
    port,
    database: {
      host: normalizedValue(source, 'DATABASE_HOST') || '127.0.0.1',
      port: databasePort,
      name: normalizedValue(source, 'DATABASE_NAME') || 'greendesk',
      user: normalizedValue(source, 'DATABASE_USER') || 'root',
      password: source.DATABASE_PASSWORD ?? '',
      logging: databaseLogging,
    },
    corsOrigins,
    apiDocs: {
      enabled: !isProduction,
    },
    trustedProxies,
    auth: {
      publicRegistrationEnabled,
    },
    mail: {
      enabled: mailEnabled,
      applicationUrl,
      from: {
        name: normalizedValue(source, 'MAIL_FROM_NAME') || 'GreenDesk',
        address: mailFromAddress || 'no-reply@greendesk.local',
      },
      smtp: {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        pool: smtpPool,
        maxConnections: smtpMaxConnections,
        maxMessages: smtpMaxMessages,
        useSystemCa: smtpUseSystemCa,
        auth: {
          type: smtpAuthType,
          user: smtpUser,
          password: smtpPassword,
          clientId: smtpOauthClientId,
          clientSecret: smtpOauthClientSecret,
          refreshToken: smtpOauthRefreshToken,
          accessToken: smtpOauthAccessToken,
          accessUrl: smtpOauthAccessUrl,
          expiresAt: smtpOauthExpiresAt,
          scope: smtpOauthScope,
        },
      },
    },
    emailVerification: {
      ttlHours: emailVerificationTtlHours,
      ttlMs: emailVerificationTtlHours * 60 * 60 * 1000,
      cooldownMs: emailVerificationCooldownSeconds * 1000,
    },
    rateLimit,
    jwt: {
      secret: jwtSecret,
      accessTokenTtl: normalizedValue(source, 'JWT_ACCESS_TOKEN_TTL') || '15m',
    },
  };
}

const env = createEnvironment();

export default env;
