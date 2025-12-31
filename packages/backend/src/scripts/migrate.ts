import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from '../config/database';
import logger from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    const pool = getPool();
    const schemaSQL = readFileSync(
      join(__dirname, '../database/schema.sql'),
      'utf-8'
    );

    await pool.query(schemaSQL);

    logger.info('Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
