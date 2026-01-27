import { Router } from 'express';
import { instructorController } from '../controllers/instructorController';
import { stakeholderController } from '../controllers/stakeholderController';
import { studentController } from '../controllers/studentController';
import { evaluationController } from '../controllers/evaluationController';

const router = Router();

// ============================================
// STUDENT ROSTER MANAGEMENT
// ============================================

// Get all students (global roster)
router.get('/students', (req, res) => studentController.getAllStudents(req, res));

// Create a new student
router.post('/students', (req, res) => studentController.createStudent(req, res));

// Bulk create students
router.post('/students/bulk', (req, res) => studentController.bulkCreateStudents(req, res));

// Update a student
router.put('/students/:studentId', (req, res) => studentController.updateStudent(req, res));

// Delete (deactivate) a student
router.delete('/students/:studentId', (req, res) => studentController.deleteStudent(req, res));

// Get team assignments for a game
router.get('/games/:gameId/team-assignments', (req, res) => studentController.getTeamAssignments(req, res));

// Assign student to team
router.post('/games/:gameId/teams/:teamId/assign-student', (req, res) =>
  studentController.assignStudentToTeam(req, res)
);

// Remove student from team
router.delete('/games/:gameId/teams/:teamId/players/:playerId', (req, res) =>
  studentController.removeStudentFromTeam(req, res)
);

// ============================================
// INCIDENT MANAGEMENT
// ============================================

// Inject AI-generated incident
router.post('/games/:gameId/inject-incident', (req, res) =>
  instructorController.injectAIIncident(req, res)
);

// Get game state for instructor dashboard
router.get('/games/:gameId/state', (req, res) =>
  instructorController.getGameState(req, res)
);

// Check and process SLA breaches
router.post('/games/:gameId/check-sla', (req, res) =>
  instructorController.checkSLABreaches(req, res)
);

// Get SLA status summary
router.get('/games/:gameId/sla-status', (req, res) =>
  instructorController.getSLAStatus(req, res)
);

// Stakeholder communication routes
router.post('/games/:gameId/stakeholder-comm', (req, res) =>
  stakeholderController.generateCommunication(req, res)
);
router.get('/games/:gameId/communications', (req, res) =>
  stakeholderController.getGameCommunications(req, res)
);

// ============================================
// STUDENT EVALUATIONS
// ============================================

// Generate end-of-game evaluations for all students
router.post('/games/:gameId/evaluate-students', (req, res) =>
  evaluationController.generateEvaluations(req, res)
);

// Get existing evaluations
router.get('/games/:gameId/evaluations', (req, res) =>
  evaluationController.getEvaluations(req, res)
);

export default router;
