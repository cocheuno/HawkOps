import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger';
import { env } from '../config/env';

/**
 * Database migration runner
 * Executes SQL migration files in order
 */
export async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  try {
    logger.info('Starting database migrations...');

    // 1. Run base schema if it exists
    try {
      const schemaSQL = readFileSync(
        join(__dirname, 'schema.sql'),
        'utf-8'
      );
      await pool.query(schemaSQL);
      logger.info('✓ Base schema executed successfully');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.info('No base schema.sql found, skipping');
      } else if (error.code === '42710' || error.code === '42P07') {
        logger.info('Base schema already exists, skipping');
      } else {
        throw error;
      }
    }

    // 2. Run all migration files in order
    const migrationsDir = join(__dirname, 'migrations');
    try {
      const migrationFiles = readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      logger.info(`Found ${migrationFiles.length} migration file(s)`);

      for (const file of migrationFiles) {
        logger.info(`Running migration: ${file}...`);
        try {
          const migrationSQL = readFileSync(join(migrationsDir, file), 'utf-8');
          await pool.query(migrationSQL);
          logger.info(`✓ Migration ${file} completed successfully`);
        } catch (migrationError: any) {
          // Ignore "already exists" errors for idempotent migrations
          if (migrationError.code === '42710' || migrationError.code === '42P07' || migrationError.code === '23505') {
            logger.info(`Migration ${file} skipped (objects already exist)`);
          } else {
            throw migrationError;
          }
        }
      }

      if (migrationFiles.length === 0) {
        logger.info('No migration files found in migrations directory');
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      logger.info('No migrations directory found, skipping');
    }

    logger.info('All migrations completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed:', error);
      process.exit(1);
    });
}
