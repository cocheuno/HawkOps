import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../database/pool';
import { env } from '../config/env';
import logger from '../utils/logger';

interface StudentTokenPayload {
  studentId: string;
  teamId: string;
  gameId: string;
  email: string;
  type: 'student_access';
}

declare global {
  namespace Express {
    interface Request {
      student?: {
        studentId: string;
        playerId: string;
        teamId: string;
        gameId: string;
        email: string;
        name: string;
      };
    }
  }
}

/**
 * Middleware to verify student access token
 * Token can be passed via:
 * - Query parameter: ?token=xxx
 * - Authorization header: Bearer xxx
 */
export const verifyStudentToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get token from query param or authorization header
  let token = req.query.token as string;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token is required',
      code: 'NO_TOKEN',
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, env.SESSION_SECRET) as StudentTokenPayload;

    if (decoded.type !== 'student_access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    // Verify the token matches the player's stored token
    const pool = getPool();
    const playerResult = await pool.query(
      `SELECT p.*, s.first_name, s.last_name, s.email
       FROM players p
       JOIN students s ON p.student_id = s.id
       WHERE p.student_id = $1::uuid
         AND p.team_id = $2::uuid
         AND p.game_id = $3::uuid
         AND p.access_token = $4
         AND p.left_at IS NULL`,
      [decoded.studentId, decoded.teamId, decoded.gameId, token]
    );

    if (playerResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token',
        code: 'TOKEN_MISMATCH',
      });
    }

    const player = playerResult.rows[0];

    // Check if game is still active
    const gameResult = await pool.query(
      `SELECT status FROM games WHERE id = $1::uuid`,
      [decoded.gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
        code: 'GAME_NOT_FOUND',
      });
    }

    const gameStatus = gameResult.rows[0].status;
    if (gameStatus === 'completed' || gameStatus === 'archived') {
      return res.status(403).json({
        success: false,
        error: 'This game session has ended',
        code: 'GAME_ENDED',
      });
    }

    // Update last accessed timestamp
    await pool.query(
      `UPDATE players
       SET last_accessed_at = NOW(), access_count = COALESCE(access_count, 0) + 1
       WHERE id = $1::uuid`,
      [player.id]
    );

    // Attach student info to request
    req.student = {
      studentId: player.student_id,
      playerId: player.id,
      teamId: player.team_id,
      gameId: player.game_id,
      email: player.email,
      name: `${player.first_name} ${player.last_name}`,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access token has expired. Please contact your instructor for a new link.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token',
        code: 'INVALID_TOKEN',
      });
    }

    logger.error('Error verifying student token:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify access token',
    });
  }
};

/**
 * Middleware to ensure student can only access their assigned team
 */
export const ensureOwnTeam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { teamId } = req.params;

  if (!req.student) {
    return res.status(401).json({
      success: false,
      error: 'Student authentication required',
    });
  }

  if (req.student.teamId !== teamId) {
    return res.status(403).json({
      success: false,
      error: 'You can only access your assigned team',
      code: 'TEAM_MISMATCH',
    });
  }

  next();
};
