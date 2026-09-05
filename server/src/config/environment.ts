type Environment = Record<string, string | undefined>;

const PRODUCTION_REQUIRED_VARIABLES = [
  'PORT',
  'DATABASE_URL',
  'DATABASE_SSL_CA_BASE64',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
] as const;

export function isProduction(environment: Environment): boolean {
  return environment.NODE_ENV?.trim() === 'production';
}

export function isEnabled(value: string | undefined): boolean {
  return value?.trim() === 'true';
}

export function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      let parsed: URL;
      try {
        parsed = new URL(entry);
      } catch {
        throw new Error('CLIENT_URL must contain valid absolute origins.');
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('CLIENT_URL origins must use HTTP or HTTPS.');
      }
      if (
        parsed.username ||
        parsed.password ||
        parsed.pathname !== '/' ||
        parsed.search ||
        parsed.hash
      ) {
        throw new Error(
          'CLIENT_URL must contain origins without paths or credentials.',
        );
      }
      return parsed.origin;
    });
}

export function validateEnvironment(environment: Environment): Environment {
  if (!isProduction(environment)) {
    validateBooleanVariables(environment);
    if (environment.CLIENT_URL?.trim()) {
      parseAllowedOrigins(environment.CLIENT_URL);
    }
    return environment;
  }

  const missing = PRODUCTION_REQUIRED_VARIABLES.filter(
    (key) => !environment[key]?.trim(),
  );
  if (missing.length) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}.`,
    );
  }

  validateBooleanVariables(environment);
  validatePort(environment.PORT);
  validateDatabaseUrl(environment.DATABASE_URL, true);
  validateCertificate(environment.DATABASE_SSL_CA_BASE64);

  const origins = parseAllowedOrigins(environment.CLIENT_URL);
  if (origins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('CLIENT_URL origins must use HTTPS in production.');
  }

  if (isEnabled(environment.TYPEORM_SYNC)) {
    throw new Error('TYPEORM_SYNC cannot be true in production.');
  }
  if (isEnabled(environment.TYPEORM_RUN_MIGRATIONS)) {
    throw new Error(
      'TYPEORM_RUN_MIGRATIONS cannot be true in production; use the pre-deploy migration command.',
    );
  }

  if (
    isEnabled(environment.SMS_WORKER_ENABLED) &&
    !isEnabled(environment.SMS_ENABLED)
  ) {
    throw new Error('SMS_WORKER_ENABLED requires SMS_ENABLED=true.');
  }
  if (isEnabled(environment.SMS_ENABLED)) {
    const missingSms = ['UNISMS_API_SECRET', 'UNISMS_SENDER_ID'].filter(
      (key) => !environment[key]?.trim(),
    );
    if (missingSms.length) {
      throw new Error(
        `Missing required SMS environment variables: ${missingSms.join(', ')}.`,
      );
    }
  }

  return environment;
}

export function validateDatabaseEnvironment(environment: Environment): void {
  if (!environment.DATABASE_URL?.trim()) {
    if (isProduction(environment)) {
      throw new Error('DATABASE_URL is required in production.');
    }
    return;
  }

  const production = isProduction(environment);
  validateDatabaseUrl(environment.DATABASE_URL, production);
  if (production) {
    validateCertificate(environment.DATABASE_SSL_CA_BASE64);
    if (isEnabled(environment.TYPEORM_SYNC)) {
      throw new Error('TYPEORM_SYNC cannot be true in production.');
    }
  }
}

export function decodeDatabaseCa(
  value: string | undefined,
): string | undefined {
  if (!value?.trim()) return undefined;

  const certificate = Buffer.from(value.trim(), 'base64')
    .toString('utf8')
    .trim();
  if (
    !certificate.startsWith('-----BEGIN CERTIFICATE-----') ||
    !certificate.endsWith('-----END CERTIFICATE-----')
  ) {
    throw new Error(
      'DATABASE_SSL_CA_BASE64 must contain a base64-encoded PEM certificate.',
    );
  }
  return certificate;
}

function validateBooleanVariables(environment: Environment): void {
  for (const key of [
    'TYPEORM_SYNC',
    'TYPEORM_RUN_MIGRATIONS',
    'SMS_ENABLED',
    'SMS_WORKER_ENABLED',
  ]) {
    const value = environment[key]?.trim();
    if (value && value !== 'true' && value !== 'false') {
      throw new Error(`${key} must be true or false.`);
    }
  }
}

function validatePort(value: string | undefined): void {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
}

function validateDatabaseUrl(
  value: string | undefined,
  production = false,
): void {
  let parsed: URL;
  try {
    parsed = new URL(value ?? '');
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol.');
  }

  const sslMode = parsed.searchParams.get('sslmode');
  if (
    sslMode &&
    ['disable', 'allow', 'prefer', 'no-verify'].includes(sslMode)
  ) {
    throw new Error(
      'DATABASE_URL cannot disable TLS certificate verification.',
    );
  }
  if (
    production &&
    ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert'].some((key) =>
      parsed.searchParams.has(key),
    )
  ) {
    throw new Error(
      'DATABASE_URL must not contain SSL query parameters in production; use DATABASE_SSL_CA_BASE64.',
    );
  }
}

function validateCertificate(value: string | undefined): void {
  decodeDatabaseCa(value);
}
