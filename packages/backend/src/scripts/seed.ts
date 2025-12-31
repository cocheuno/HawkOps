import { getPool } from '../config/database';
import logger from '../utils/logger';

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    const pool = getPool();

    // Create a demo game
    const gameResult = await pool.query(`
      INSERT INTO games (name, status, duration_minutes)
      VALUES ('Demo Game', 'lobby', 75)
      RETURNING id
    `);

    const gameId = gameResult.rows[0].id;
    logger.info(`Created demo game: ${gameId}`);

    // Create teams
    const teams = [
      { name: 'Hawks Service Desk', role: 'Service Desk' },
      { name: 'Hawks Tech Ops', role: 'Technical Operations' },
      { name: 'Hawks Management', role: 'Management/CAB' },
    ];

    for (const team of teams) {
      const result = await pool.query(`
        INSERT INTO teams (game_id, name, role)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [gameId, team.name, team.role]);

      logger.info(`Created team: ${team.name} (${result.rows[0].id})`);
    }

    // Create a sample incident
    await pool.query(`
      INSERT INTO incidents (game_id, title, description, priority, status)
      VALUES (
        $1,
        'Email System Outage',
        'Users are reporting they cannot access their email. The webmail interface is showing a 503 error.',
        'high',
        'open'
      )
    `, [gameId]);

    logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
