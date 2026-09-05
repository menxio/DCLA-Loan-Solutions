import { decodeDatabaseCa, validateEnvironment } from './environment';

const certificate = Buffer.from(
  '-----BEGIN CERTIFICATE-----\ntest-ca\n-----END CERTIFICATE-----',
).toString('base64');

function productionEnvironment() {
  return {
    NODE_ENV: 'production',
    PORT: '10000',
    DATABASE_URL: 'postgresql://user:private-password@db.example.com/postgres',
    DATABASE_SSL_CA_BASE64: certificate,
    JWT_SECRET: 'private-access-secret',
    JWT_REFRESH_SECRET: 'private-refresh-secret',
    CLIENT_URL: 'https://app.example.com',
    TYPEORM_SYNC: 'false',
    TYPEORM_RUN_MIGRATIONS: 'false',
    SMS_ENABLED: 'false',
    SMS_WORKER_ENABLED: 'false',
  };
}

describe('validateEnvironment', () => {
  it('accepts a complete production environment', () => {
    const environment = productionEnvironment();
    expect(validateEnvironment(environment)).toBe(environment);
  });

  it('fails closed when CLIENT_URL is missing in production', () => {
    const environment = productionEnvironment();
    delete (environment as Partial<typeof environment>).CLIENT_URL;

    expect(() => validateEnvironment(environment)).toThrow('CLIENT_URL');
  });

  it('refuses TypeORM synchronization in production', () => {
    const environment = { ...productionEnvironment(), TYPEORM_SYNC: 'true' };
    expect(() => validateEnvironment(environment)).toThrow(
      'TYPEORM_SYNC cannot be true in production.',
    );
  });

  it('rejects database URL options that could override verified TLS', () => {
    const environment = {
      ...productionEnvironment(),
      DATABASE_URL:
        'postgresql://user:private-password@db.example.com/postgres?sslmode=require',
    };

    expect(() => validateEnvironment(environment)).toThrow(
      'DATABASE_URL must not contain SSL query parameters in production',
    );
  });

  it('does not reveal secret values in validation errors', () => {
    const environment = {
      ...productionEnvironment(),
      CLIENT_URL: 'not-an-origin',
    };

    expect(() => validateEnvironment(environment)).toThrow('CLIENT_URL');
    try {
      validateEnvironment(environment);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain('private-password');
      expect(message).not.toContain('private-access-secret');
      expect(message).not.toContain('private-refresh-secret');
    }
  });
});

describe('decodeDatabaseCa', () => {
  it('decodes a base64 PEM certificate', () => {
    expect(decodeDatabaseCa(certificate)).toContain('BEGIN CERTIFICATE');
  });
});
