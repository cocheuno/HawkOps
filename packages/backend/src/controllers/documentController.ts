import { Request, Response } from 'express';
import { getPool } from '../config/database';
import logger from '../utils/logger';

/**
 * Document Controller
 * Handles simulation briefing documents (playbooks, briefings, team packets, player instructions)
 */
export class DocumentController {
  /**
   * Create a new document
   * POST /api/instructor/games/:gameId/documents
   */
  async createDocument(req: Request, res: Response) {
    const { gameId } = req.params;
    const {
      documentType,
      title,
      content,
      visibility,
      teamId,
      playerId,
      status = 'draft',
      publishAt,
      orderIndex = 0,
      isRequiredReading = false,
      estimatedReadTime,
      tags = [],
    } = req.body;

    const pool = getPool();

    try {
      // Validate required fields
      if (!documentType || !title || !content || !visibility) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: documentType, title, content, visibility',
        });
      }

      // Insert document
      const result = await pool.query(
        `INSERT INTO simulation_documents
         (game_id, document_type, title, content, visibility, team_id, player_id,
          status, publish_at, order_index, is_required_reading, estimated_read_time, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          gameId,
          documentType,
          title,
          content,
          visibility,
          teamId || null,
          playerId || null,
          status,
          publishAt || null,
          orderIndex,
          isRequiredReading,
          estimatedReadTime || null,
          tags,
        ]
      );

      logger.info(`Document created: ${result.rows[0].id} for game ${gameId}`);

      return res.status(201).json({
        success: true,
        document: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error creating document:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create document',
        message: error.message,
      });
    }
  }

  /**
   * Get all documents for a game (instructor view)
   * GET /api/instructor/games/:gameId/documents
   */
  async getGameDocuments(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT
          sd.*,
          t.name as team_name,
          p.name as player_name,
          jsonb_array_length(read_receipts) as read_count
         FROM simulation_documents sd
         LEFT JOIN teams t ON sd.team_id = t.id
         LEFT JOIN players p ON sd.player_id = p.id
         WHERE sd.game_id = $1
         ORDER BY sd.order_index, sd.created_at`,
        [gameId]
      );

      return res.json({
        success: true,
        documents: result.rows,
      });
    } catch (error: any) {
      logger.error('Error fetching game documents:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch documents',
        message: error.message,
      });
    }
  }

  /**
   * Get specific document
   * GET /api/instructor/games/:gameId/documents/:documentId
   */
  async getDocument(req: Request, res: Response) {
    const { gameId, documentId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT sd.*, t.name as team_name, p.name as player_name
         FROM simulation_documents sd
         LEFT JOIN teams t ON sd.team_id = t.id
         LEFT JOIN players p ON sd.player_id = p.id
         WHERE sd.id = $1::uuid AND sd.game_id = $2::uuid`,
        [documentId, gameId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }

      return res.json({
        success: true,
        document: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error fetching document:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document',
        message: error.message,
      });
    }
  }

  /**
   * Update document
   * PUT /api/instructor/games/:gameId/documents/:documentId
   */
  async updateDocument(req: Request, res: Response) {
    const { gameId, documentId } = req.params;
    const {
      title,
      content,
      visibility,
      teamId,
      playerId,
      status,
      publishAt,
      orderIndex,
      isRequiredReading,
      estimatedReadTime,
      tags,
    } = req.body;

    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE simulation_documents
         SET title = COALESCE($1, title),
             content = COALESCE($2, content),
             visibility = COALESCE($3, visibility),
             team_id = COALESCE($4, team_id),
             player_id = COALESCE($5, player_id),
             status = COALESCE($6, status),
             publish_at = COALESCE($7, publish_at),
             order_index = COALESCE($8, order_index),
             is_required_reading = COALESCE($9, is_required_reading),
             estimated_read_time = COALESCE($10, estimated_read_time),
             tags = COALESCE($11, tags),
             updated_at = NOW()
         WHERE id = $12::uuid AND game_id = $13::uuid
         RETURNING *`,
        [
          title,
          content,
          visibility,
          teamId,
          playerId,
          status,
          publishAt,
          orderIndex,
          isRequiredReading,
          estimatedReadTime,
          tags,
          documentId,
          gameId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }

      logger.info(`Document updated: ${documentId}`);

      return res.json({
        success: true,
        document: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error updating document:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update document',
        message: error.message,
      });
    }
  }

  /**
   * Delete document
   * DELETE /api/instructor/games/:gameId/documents/:documentId
   */
  async deleteDocument(req: Request, res: Response) {
    const { gameId, documentId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `DELETE FROM simulation_documents
         WHERE id = $1::uuid AND game_id = $2::uuid
         RETURNING id`,
        [documentId, gameId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }

      logger.info(`Document deleted: ${documentId}`);

      return res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting document:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete document',
        message: error.message,
      });
    }
  }

  /**
   * Publish/unpublish document
   * PATCH /api/instructor/games/:gameId/documents/:documentId/publish
   */
  async publishDocument(req: Request, res: Response) {
    const { gameId, documentId } = req.params;
    const { status, publishAt } = req.body;

    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE simulation_documents
         SET status = $1::varchar,
             publish_at = $2,
             updated_at = NOW()
         WHERE id = $3::uuid AND game_id = $4::uuid
         RETURNING *`,
        [status || 'published', publishAt || null, documentId, gameId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }

      logger.info(`Document ${status === 'published' ? 'published' : 'unpublished'}: ${documentId}`);

      return res.json({
        success: true,
        document: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error publishing document:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to publish document',
        message: error.message,
      });
    }
  }

  /**
   * Get read receipts for a document
   * GET /api/instructor/games/:gameId/documents/:documentId/receipts
   */
  async getReadReceipts(req: Request, res: Response) {
    const { gameId, documentId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT sd.id, sd.title, sd.read_receipts,
                jsonb_array_length(sd.read_receipts) as read_count
         FROM simulation_documents sd
         WHERE sd.id = $1::uuid AND sd.game_id = $2::uuid`,
        [documentId, gameId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }

      // Get total participant count for this game
      const participantsResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM players
         WHERE game_id = $1::uuid`,
        [gameId]
      );

      return res.json({
        success: true,
        document: {
          id: result.rows[0].id,
          title: result.rows[0].title,
        },
        readReceipts: result.rows[0].read_receipts || [],
        readCount: result.rows[0].read_count || 0,
        totalParticipants: parseInt(participantsResult.rows[0].total),
      });
    } catch (error: any) {
      logger.error('Error fetching read receipts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch read receipts',
        message: error.message,
      });
    }
  }

  /**
   * Get documents available to a participant
   * GET /api/games/:gameId/documents?playerId=xxx
   */
  async getParticipantDocuments(req: Request, res: Response) {
    const { gameId } = req.params;
    const { playerId } = req.query;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'playerId query parameter is required',
      });
    }

    const pool = getPool();

    try {
      // Get player's team
      const playerResult = await pool.query(
        `SELECT team_id FROM players WHERE id = $1::uuid`,
        [playerId]
      );

      if (playerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Player not found',
        });
      }

      const teamId = playerResult.rows[0].team_id;

      // Get documents visible to this player
      const result = await pool.query(
        `SELECT id, document_type, title, visibility, is_required_reading,
                estimated_read_time, tags, created_at,
                read_receipts @> $1::jsonb as is_read
         FROM simulation_documents
         WHERE game_id = $2::uuid
           AND status = 'published'
           AND (publish_at IS NULL OR publish_at <= NOW())
           AND (
             visibility = 'all_participants'
             OR (visibility = 'team_only' AND team_id = $3::uuid)
             OR (visibility = 'player_only' AND player_id = $4::uuid)
           )
         ORDER BY order_index, created_at`,
        [
          JSON.stringify([{ player_id: playerId }]),
          gameId,
          teamId,
          playerId,
        ]
      );

      return res.json({
        success: true,
        documents: result.rows,
      });
    } catch (error: any) {
      logger.error('Error fetching participant documents:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch documents',
        message: error.message,
      });
    }
  }

  /**
   * Get document content (participant view)
   * GET /api/games/:gameId/documents/:documentId?playerId=xxx
   */
  async getParticipantDocument(req: Request, res: Response) {
    const { gameId, documentId } = req.params;
    const { playerId } = req.query;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'playerId query parameter is required',
      });
    }

    const pool = getPool();

    try {
      // Get player's team
      const playerResult = await pool.query(
        `SELECT team_id FROM players WHERE id = $1::uuid`,
        [playerId]
      );

      if (playerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Player not found',
        });
      }

      const teamId = playerResult.rows[0].team_id;

      // Get document with access control
      const result = await pool.query(
        `SELECT id, document_type, title, content, visibility, is_required_reading,
                estimated_read_time, tags, created_at,
                read_receipts @> $1::jsonb as is_read
         FROM simulation_documents
         WHERE id = $2::uuid
           AND game_id = $3::uuid
           AND status = 'published'
           AND (publish_at IS NULL OR publish_at <= NOW())
           AND (
             visibility = 'all_participants'
             OR (visibility = 'team_only' AND team_id = $4::uuid)
             OR (visibility = 'player_only' AND player_id = $5::uuid)
           )`,
        [
          JSON.stringify([{ player_id: playerId }]),
          documentId,
          gameId,
          teamId,
          playerId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found or you do not have access',
        });
      }

      return res.json({
        success: true,
        document: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error fetching participant document:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document',
        message: error.message,
      });
    }
  }

  /**
   * Mark document as read
   * POST /api/games/:gameId/documents/:documentId/mark-read
   */
  async markAsRead(req: Request, res: Response) {
    const { gameId, documentId } = req.params;
    const { playerId, ipAddress } = req.body;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'playerId is required',
      });
    }

    const pool = getPool();

    try {
      // Add read receipt
      const result = await pool.query(
        `UPDATE simulation_documents
         SET read_receipts = read_receipts || $1::jsonb
         WHERE id = $2::uuid
           AND game_id = $3::uuid
           AND NOT (read_receipts @> $4::jsonb)
         RETURNING id`,
        [
          JSON.stringify({ player_id: playerId, read_at: new Date().toISOString(), ip_address: ipAddress }),
          documentId,
          gameId,
          JSON.stringify([{ player_id: playerId }]),
        ]
      );

      if (result.rows.length === 0) {
        // Either document not found or already marked as read
        return res.json({
          success: true,
          message: 'Document already marked as read',
        });
      }

      logger.info(`Document ${documentId} marked as read by player ${playerId}`);

      return res.json({
        success: true,
        message: 'Document marked as read',
      });
    } catch (error: any) {
      logger.error('Error marking document as read:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark document as read',
        message: error.message,
      });
    }
  }

  /**
   * Get all document templates
   * GET /api/instructor/templates
   */
  async getTemplates(req: Request, res: Response) {
    const { documentType, scenarioType } = req.query;
    const pool = getPool();

    try {
      let query = `SELECT * FROM document_templates WHERE is_public = true`;
      const params: any[] = [];

      if (documentType) {
        params.push(documentType);
        query += ` AND document_type = $${params.length}`;
      }

      if (scenarioType) {
        params.push(scenarioType);
        query += ` AND scenario_type = $${params.length}`;
      }

      query += ` ORDER BY usage_count DESC, name`;

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        templates: result.rows,
      });
    } catch (error: any) {
      logger.error('Error fetching templates:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch templates',
        message: error.message,
      });
    }
  }
}

// Export singleton instance
export const documentController = new DocumentController();
