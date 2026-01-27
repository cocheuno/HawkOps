import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database';
import { env } from '../config/env';
import logger from '../utils/logger';

export class AuthController {
  /**
   * Email-only login
   * POST /api/auth/login
   *
   * If the email matches the instructor email, return an instructor token.
   * If the email matches a student with an active game assignment, return a student token
   * pointing them to their team.
   */
  async login(req: Request, res: Response) {
    const pool = getPool();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Check if instructor
      if (normalizedEmail === env.INSTRUCTOR_EMAIL.toLowerCase()) {
        const token = jwt.sign(
          { email: normalizedEmail, role: 'instructor' },
          env.SESSION_SECRET,
          { expiresIn: '24h' }
        );

        // Find the most recent active or lobby game for the instructor
        const gameResult = await pool.query(
          `SELECT id, name, status FROM games
           WHERE status IN ('lobby', 'active', 'paused')
           ORDER BY created_at DESC LIMIT 1`
        );

        return res.json({
          success: true,
          role: 'instructor',
          token,
          email: normalizedEmail,
          activeGame: gameResult.rows.length > 0 ? {
            id: gameResult.rows[0].id,
            name: gameResult.rows[0].name,
            status: gameResult.rows[0].status,
          } : null,
        });
      }

      // Check if student
      const studentResult = await pool.query(
        `SELECT s.id as student_id, s.first_name, s.last_name, s.email,
                p.id as player_id, p.team_id, p.game_id, p.access_token,
                t.name as team_name, t.role as team_role,
                g.name as game_name, g.status as game_status
         FROM students s
         JOIN players p ON p.student_id = s.id AND p.left_at IS NULL
         JOIN teams t ON p.team_id = t.id
         JOIN games g ON p.game_id = g.id
         WHERE LOWER(s.email) = $1
           AND g.status IN ('lobby', 'active', 'paused')
         ORDER BY g.created_at DESC
         LIMIT 1`,
        [normalizedEmail]
      );

      if (studentResult.rows.length > 0) {
        const student = studentResult.rows[0];

        // Use the existing access token if available, otherwise generate new one
        let accessToken = student.access_token;
        if (!accessToken) {
          accessToken = jwt.sign(
            {
              studentId: student.student_id,
              teamId: student.team_id,
              gameId: student.game_id,
              email: normalizedEmail,
              type: 'student_access',
            },
            env.SESSION_SECRET,
            { expiresIn: '7d' }
          );

          // Store the token
          await pool.query(
            `UPDATE players SET access_token = $1 WHERE id = $2`,
            [accessToken, student.player_id]
          );
        }

        return res.json({
          success: true,
          role: 'student',
          token: accessToken,
          email: normalizedEmail,
          student: {
            id: student.student_id,
            name: `${student.first_name} ${student.last_name}`,
          },
          team: {
            id: student.team_id,
            name: student.team_name,
            role: student.team_role,
          },
          game: {
            id: student.game_id,
            name: student.game_name,
            status: student.game_status,
          },
        });
      }

      // Email not found
      return res.status(404).json({
        error: 'No account found for this email. If you are a student, please ask your instructor to add you to the game.',
      });
    } catch (error) {
      logger.error('Error in login:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Get current AI model info
   * GET /api/config/ai-info
   */
  async getAIInfo(_req: Request, res: Response) {
    return res.json({
      provider: env.AI_PROVIDER,
      model: env.AI_PROVIDER === 'gemini' ? env.GEMINI_MODEL : env.CLAUDE_MODEL,
    });
  }
}

export const authController = new AuthController();
