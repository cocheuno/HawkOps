import { readFileSync } from 'fs';
import { join } from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database';
import logger from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Connect to database
    const pool = await connectDatabase();

    // Read schema file
    const schemaSQL = readFileSync(
      join(__dirname, '../database/schema.sql'),
      'utf-8'
    );

    // Run migrations
    await pool.query(schemaSQL);

    logger.info('Database migrations completed successfully');

    // Disconnect from database
    await disconnectDatabase();

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
