import { Router } from 'express';
import { documentController } from '../controllers/documentController';

const router = Router();

// Instructor routes
router.post('/instructor/games/:gameId/documents', (req, res) =>
  documentController.createDocument(req, res)
);
router.get('/instructor/games/:gameId/documents', (req, res) =>
  documentController.getGameDocuments(req, res)
);
router.get('/instructor/games/:gameId/documents/:documentId', (req, res) =>
  documentController.getDocument(req, res)
);
router.put('/instructor/games/:gameId/documents/:documentId', (req, res) =>
  documentController.updateDocument(req, res)
);
router.delete('/instructor/games/:gameId/documents/:documentId', (req, res) =>
  documentController.deleteDocument(req, res)
);
router.patch('/instructor/games/:gameId/documents/:documentId/publish', (req, res) =>
  documentController.publishDocument(req, res)
);
router.get('/instructor/games/:gameId/documents/:documentId/receipts', (req, res) =>
  documentController.getReadReceipts(req, res)
);
router.get('/instructor/templates', (req, res) =>
  documentController.getTemplates(req, res)
);

// Participant routes
router.get('/games/:gameId/documents', (req, res) =>
  documentController.getParticipantDocuments(req, res)
);
router.get('/games/:gameId/documents/:documentId', (req, res) =>
  documentController.getParticipantDocument(req, res)
);
router.post('/games/:gameId/documents/:documentId/mark-read', (req, res) =>
  documentController.markAsRead(req, res)
);

export default router;
