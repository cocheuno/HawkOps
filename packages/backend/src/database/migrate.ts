import { Pool } from 'pg';
import { readFileSync } from 'fs';
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

    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '001_ai_simulation_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(migrationSQL);

    logger.info('✓ Migration 001_ai_simulation_schema.sql completed successfully');

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
