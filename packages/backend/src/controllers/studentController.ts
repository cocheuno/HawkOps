import { Request, Response } from 'express';
import { getPool } from '../config/database';
import logger from '../utils/logger';

export class StudentController {
  /**
   * Get all students (global roster)
   * GET /api/instructor/students
   */
  async getAllStudents(_req: Request, res: Response) {
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT id, student_id, first_name, last_name, email, department, notes, is_active, created_at
         FROM students
         WHERE is_active = true
         ORDER BY last_name, first_name`
      );

      return res.json({
        success: true,
        students: result.rows,
      });
    } catch (error: any) {
      logger.error('Error fetching students:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch students',
        details: error.message,
      });
    }
  }

  /**
   * Create a new student
   * POST /api/instructor/students
   */
  async createStudent(req: Request, res: Response) {
    const { studentId, firstName, lastName, email, department, notes } = req.body;
    const pool = getPool();

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required',
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO students (student_id, first_name, last_name, email, department, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [studentId || null, firstName, lastName, email || null, department || null, notes || null]
      );

      return res.status(201).json({
        success: true,
        student: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error creating student:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'A student with this ID or email already exists',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create student',
        details: error.message,
      });
    }
  }

  /**
   * Bulk create students
   * POST /api/instructor/students/bulk
   */
  async bulkCreateStudents(req: Request, res: Response) {
    const { students } = req.body;
    const pool = getPool();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'An array of students is required',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const createdStudents = [];
      const errors = [];

      for (const student of students) {
        try {
          const result = await client.query(
            `INSERT INTO students (student_id, first_name, last_name, email, department, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (email) DO UPDATE SET
               first_name = EXCLUDED.first_name,
               last_name = EXCLUDED.last_name,
               department = EXCLUDED.department,
               notes = EXCLUDED.notes,
               updated_at = NOW()
             RETURNING *`,
            [
              student.studentId || null,
              student.firstName,
              student.lastName,
              student.email || null,
              student.department || null,
              student.notes || null,
            ]
          );
          createdStudents.push(result.rows[0]);
        } catch (err: any) {
          errors.push({ student, error: err.message });
        }
      }

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        created: createdStudents.length,
        errors: errors.length > 0 ? errors : undefined,
        students: createdStudents,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error bulk creating students:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to bulk create students',
        details: error.message,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Update a student
   * PUT /api/instructor/students/:studentId
   */
  async updateStudent(req: Request, res: Response) {
    const { studentId } = req.params;
    const { firstName, lastName, email, department, notes, isActive, studentIdCode } = req.body;
    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE students
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             email = COALESCE($3, email),
             department = COALESCE($4, department),
             notes = COALESCE($5, notes),
             is_active = COALESCE($6, is_active),
             student_id = COALESCE($7, student_id),
             updated_at = NOW()
         WHERE id = $8::uuid
         RETURNING *`,
        [firstName, lastName, email, department, notes, isActive, studentIdCode, studentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found',
        });
      }

      return res.json({
        success: true,
        student: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error updating student:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update student',
        details: error.message,
      });
    }
  }

  /**
   * Delete (deactivate) a student
   * DELETE /api/instructor/students/:studentId
   */
  async deleteStudent(req: Request, res: Response) {
    const { studentId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE students SET is_active = false, updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING *`,
        [studentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found',
        });
      }

      return res.json({
        success: true,
        message: 'Student deactivated',
      });
    } catch (error: any) {
      logger.error('Error deleting student:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete student',
        details: error.message,
      });
    }
  }

  /**
   * Assign student to a team in a game
   * POST /api/instructor/games/:gameId/teams/:teamId/assign-student
   */
  async assignStudentToTeam(req: Request, res: Response) {
    const { gameId, teamId } = req.params;
    const { studentId, sendEmail: shouldSendEmail } = req.body;
    const pool = getPool();

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required',
      });
    }

    try {
      // Get student details
      const studentResult = await pool.query(
        `SELECT * FROM students WHERE id = $1::uuid AND is_active = true`,
        [studentId]
      );

      if (studentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found',
        });
      }

      const student = studentResult.rows[0];

      // Get team and game details for the email
      const teamResult = await pool.query(
        `SELECT t.*, g.name as game_name
         FROM teams t
         JOIN games g ON t.game_id = g.id
         WHERE t.id = $1::uuid`,
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Team not found',
        });
      }

      const team = teamResult.rows[0];

      // Check if student is already assigned to a team in this game
      const existingPlayer = await pool.query(
        `SELECT p.*, t.name as team_name
         FROM players p
         LEFT JOIN teams t ON p.team_id = t.id
         WHERE p.game_id = $1::uuid AND p.student_id = $2::uuid`,
        [gameId, studentId]
      );

      // Generate access token for student
      const jwt = require('jsonwebtoken');
      const { env } = require('../config/env');
      const accessToken = jwt.sign(
        {
          studentId: student.id,
          teamId,
          gameId,
          email: student.email,
          type: 'student_access',
        },
        env.SESSION_SECRET,
        { expiresIn: '7d' }
      );

      let playerId: string;

      if (existingPlayer.rows.length > 0) {
        // Update existing player's team and access token
        const result = await pool.query(
          `UPDATE players
           SET team_id = $1::uuid, access_token = $4, updated_at = NOW()
           WHERE game_id = $2::uuid AND student_id = $3::uuid
           RETURNING *`,
          [teamId, gameId, studentId, accessToken]
        );
        playerId = result.rows[0].id;
      } else {
        // Create new player for this game with access token
        const result = await pool.query(
          `INSERT INTO players (game_id, team_id, student_id, name, access_token)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
           RETURNING *`,
          [gameId, teamId, studentId, `${student.first_name} ${student.last_name}`, accessToken]
        );
        playerId = result.rows[0].id;
      }

      // Send email if requested and email is available
      let emailSent = false;
      if (shouldSendEmail !== false && student.email) {
        const { emailService } = require('../services/email.service');
        const teamPageUrl = `${env.CLIENT_URL}/student/team/${teamId}`;

        emailSent = await emailService.sendTeamAssignmentEmail({
          studentName: `${student.first_name} ${student.last_name}`,
          studentEmail: student.email,
          teamName: team.name,
          teamRole: team.role,
          gameName: team.game_name,
          teamPageUrl,
          accessToken,
        });
      }

      return res.status(existingPlayer.rows.length > 0 ? 200 : 201).json({
        success: true,
        message: existingPlayer.rows.length > 0 ? 'Student reassigned to team' : 'Student assigned to team',
        playerId,
        accessToken,
        emailSent,
        teamPageUrl: `${env.CLIENT_URL}/student/team/${teamId}?token=${accessToken}`,
      });
    } catch (error: any) {
      logger.error('Error assigning student to team:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to assign student to team',
        details: error.message,
      });
    }
  }

  /**
   * Remove student from a team in a game
   * DELETE /api/instructor/games/:gameId/teams/:teamId/players/:playerId
   */
  async removeStudentFromTeam(req: Request, res: Response) {
    const { gameId, teamId, playerId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE players
         SET team_id = NULL
         WHERE id = $1::uuid AND game_id = $2::uuid AND team_id = $3::uuid
         RETURNING *`,
        [playerId, gameId, teamId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Player not found in this team',
        });
      }

      return res.json({
        success: true,
        message: 'Student removed from team',
      });
    } catch (error: any) {
      logger.error('Error removing student from team:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to remove student from team',
        details: error.message,
      });
    }
  }

  /**
   * Get students assigned to teams for a game
   * GET /api/instructor/games/:gameId/team-assignments
   */
  async getTeamAssignments(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      // Get teams with their assigned players
      const teamsResult = await pool.query(
        `SELECT t.id, t.name, t.role,
                COALESCE(json_agg(
                  json_build_object(
                    'playerId', p.id,
                    'studentId', p.student_id,
                    'name', p.name,
                    'student', s
                  )
                ) FILTER (WHERE p.id IS NOT NULL), '[]') as players
         FROM teams t
         LEFT JOIN players p ON p.team_id = t.id AND p.game_id = t.game_id
         LEFT JOIN students s ON p.student_id = s.id
         WHERE t.game_id = $1::uuid
         GROUP BY t.id, t.name, t.role
         ORDER BY t.created_at`,
        [gameId]
      );

      // Get unassigned students for this game
      const unassignedResult = await pool.query(
        `SELECT p.id as player_id, p.name, p.student_id, s.*
         FROM players p
         LEFT JOIN students s ON p.student_id = s.id
         WHERE p.game_id = $1::uuid AND p.team_id IS NULL`,
        [gameId]
      );

      return res.json({
        success: true,
        teams: teamsResult.rows,
        unassigned: unassignedResult.rows,
      });
    } catch (error: any) {
      logger.error('Error fetching team assignments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch team assignments',
        details: error.message,
      });
    }
  }
}

export const studentController = new StudentController();
