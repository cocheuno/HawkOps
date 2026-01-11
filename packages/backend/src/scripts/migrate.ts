import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database';
import logger from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Connect to database
    const pool = await connectDatabase();

    // Determine paths - look in source directory since .sql files aren't compiled
    const isProduction = process.env.NODE_ENV === 'production';
    const srcPath = isProduction
      ? join(__dirname, '../../src/database')  // In production, go back to src
      : join(__dirname, '../database');        // In dev, relative to dist

    logger.info(`Looking for migrations in: ${srcPath}`);

    // 1. Run base schema if it exists
    try {
      const schemaSQL = readFileSync(
        join(srcPath, 'schema.sql'),
        'utf-8'
      );
      await pool.query(schemaSQL);
      logger.info('✓ Base schema executed successfully');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.info('No base schema.sql found, skipping');
      } else if (error.code === '42710' || error.code === '42P07') {
        // 42710 = duplicate object (trigger, etc.)
        // 42P07 = duplicate table
        logger.info('Base schema already exists, skipping');
      } else {
        throw error; // Re-throw unexpected errors
      }
    }

    // 2. Run migration files in order
    const migrationsDir = join(srcPath, 'migrations');
    try {
      const migrationFiles = readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort(); // Ensure migrations run in alphabetical order

      logger.info(`Found ${migrationFiles.length} migration file(s)`);

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
