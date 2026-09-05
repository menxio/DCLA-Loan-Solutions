import {
  createApplicationDatabaseOptions,
  createMigrationDatabaseOptions,
} from './database.config';

const certificate = Buffer.from(
  '-----BEGIN CERTIFICATE-----\ntest-ca\n-----END CERTIFICATE-----',
).toString('base64');

const productionEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@db.example.com/postgres',
  DATABASE_SSL_CA_BASE64: certificate,
  TYPEORM_SYNC: 'false',
  TYPEORM_RUN_MIGRATIONS: 'false',
};

describe('database configuration', () => {
  it('forces production application synchronization and migrations off', () => {
    const options = createApplicationDatabaseOptions(productionEnvironment);

    expect(options).toMatchObject({
      synchronize: false,
      migrationsRun: false,
      ssl: { rejectUnauthorized: true },
    });
  });

  it('keeps the migration data source non-synchronizing', () => {
    const options = createMigrationDatabaseOptions(productionEnvironment);

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(String(options.migrations?.[0])).toContain('migrations');
    expect(String(options.migrations?.[0])).not.toContain('.spec.');
  });
});
