import { Router, Request, Response } from 'express';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getPool } from '../config/database';
import logger from '../utils/logger';

const router = Router();

// DANGER: This should be protected in production!
// Only use for initial setup, then disable or protect with auth
router.post('/migrate', async (req: Request, res: Response) => {
  try {
    logger.info('Starting database migrations via HTTP endpoint...');

    const pool = getPool();

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
        throw error;
      }
      logger.info('No base schema.sql found, skipping');
    }

    // 2. Run migration files in order
    const migrationsDir = join(__dirname, '../database/migrations');
    const results: string[] = [];

    try {
      const migrationFiles = readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        logger.info(`Running migration: ${file}...`);
        const migrationSQL = readFileSync(join(migrationsDir, file), 'utf-8');
        await pool.query(migrationSQL);
        results.push(`✓ Migration ${file} completed successfully`);
        logger.info(`✓ Migration ${file} completed successfully`);
      }

      if (migrationFiles.length === 0) {
        results.push('No migration files found in migrations directory');
        logger.info('No migration files found in migrations directory');
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      results.push('No migrations directory found, skipping');
      logger.info('No migrations directory found, skipping');
    }

    logger.info('All migrations completed successfully!');

    res.json({
      success: true,
      message: 'All migrations completed successfully!',
      results,
    });
  } catch (error: any) {
    logger.error('Migration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

export default router;
