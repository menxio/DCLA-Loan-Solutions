import { join } from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import {
  decodeDatabaseCa,
  isEnabled,
  isProduction,
  validateDatabaseEnvironment,
} from './environment';

type Environment = Record<string, string | undefined>;

export function createApplicationDatabaseOptions(
  environment: Environment,
): TypeOrmModuleOptions {
  validateDatabaseEnvironment(environment);
  const production = isProduction(environment);

  return {
    type: 'postgres',
    url: environment.DATABASE_URL,
    autoLoadEntities: true,
    synchronize: production ? false : isEnabled(environment.TYPEORM_SYNC),
    migrationsRun: production
      ? false
      : isEnabled(environment.TYPEORM_RUN_MIGRATIONS),
    migrations: [join(__dirname, '..', 'migrations', '*{.js,.ts}')],
    ssl: databaseSslOptions(environment),
  };
}

export function createMigrationDatabaseOptions(
  environment: Environment,
): DataSourceOptions {
  validateDatabaseEnvironment(environment);

  return {
    type: 'postgres',
    url: environment.DATABASE_URL,
    entities: [join(__dirname, '..', '**', '*.entity{.js,.ts}')],
    migrations: [join(__dirname, '..', 'migrations', '*{.js,.ts}')],
    synchronize: false,
    migrationsRun: false,
    ssl: databaseSslOptions(environment),
  };
}

function databaseSslOptions(environment: Environment) {
  const certificate = decodeDatabaseCa(environment.DATABASE_SSL_CA_BASE64);
  if (certificate) {
    return { rejectUnauthorized: true, ca: certificate };
  }

  if (isProduction(environment)) {
    throw new Error('DATABASE_SSL_CA_BASE64 is required in production.');
  }

  return { rejectUnauthorized: false };
}
