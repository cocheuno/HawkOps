import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import GameLobbyPage from './pages/GameLobbyPage';
import GameplayPage from './pages/GameplayPage';
import InstructorDashboardPage from './pages/InstructorDashboardPage';
import OperationsDashboardPage from './pages/OperationsDashboardPage';
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
        <Route path="/team/:teamId" element={<OperationsDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
