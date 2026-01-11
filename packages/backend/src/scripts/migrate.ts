import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database';
import logger from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Connect to database
    const pool = await connectDatabase();

    // 1. Run base schema if it exists
    try {
      const schemaSQL = readFileSync(
        join(__dirname, '../database/schema.sql'),
        'utf-8'
      );
      await pool.query(schemaSQL);
      logger.info('✓ Base schema executed successfully');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error; // Re-throw if not a "file not found" error
      }
      logger.info('No base schema.sql found, skipping');
    }

    // 2. Run migration files in order
    const migrationsDir = join(__dirname, '../database/migrations');
    try {
      const migrationFiles = readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort(); // Ensure migrations run in alphabetical order

      for (const file of migrationFiles) {
        logger.info(`Running migration: ${file}...`);
        const migrationSQL = readFileSync(join(migrationsDir, file), 'utf-8');
        await pool.query(migrationSQL);
        logger.info(`✓ Migration ${file} completed successfully`);
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

    // Disconnect from database
    await disconnectDatabase();

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
