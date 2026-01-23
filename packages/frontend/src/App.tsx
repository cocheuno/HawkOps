import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import GameLobbyPage from './pages/GameLobbyPage';
import GameplayPage from './pages/GameplayPage';
import InstructorDashboardPage from './pages/InstructorDashboardPage';
import OperationsDashboardPage from './pages/OperationsDashboardPage';
import DocumentManagerPage from './pages/DocumentManagerPage';
import ParticipantDocumentsPage from './pages/ParticipantDocumentsPage';
import AIScenarioGeneratorPage from './pages/AIScenarioGeneratorPage';
import InstructorPlaybookPage from './pages/InstructorPlaybookPage';
import StudentManagementPage from './pages/StudentManagementPage';
import StudentTeamPage from './pages/StudentTeamPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:gameId" element={<GameLobbyPage />} />
        <Route path="/game/:gameId" element={<GameplayPage />} />
        <Route path="/instructor/:gameId" element={<InstructorDashboardPage />} />
        <Route path="/instructor/game/:gameId/documents" element={<DocumentManagerPage />} />
        <Route path="/instructor/game/:gameId/ai-generate" element={<AIScenarioGeneratorPage />} />
        <Route path="/instructor/game/:gameId/playbook" element={<InstructorPlaybookPage />} />
        <Route path="/instructor/game/:gameId/students" element={<StudentManagementPage />} />
        <Route path="/game/:gameId/briefing" element={<ParticipantDocumentsPage />} />
        <Route path="/team/:teamId" element={<OperationsDashboardPage />} />
        {/* Student-only team page (accessed via email link with token) */}
        <Route path="/student/team/:teamId" element={<StudentTeamPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
