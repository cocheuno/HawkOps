import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import GameLobbyPage from './pages/GameLobbyPage';
import GameplayPage from './pages/GameplayPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:gameId" element={<GameLobbyPage />} />
        <Route path="/game/:gameId" element={<GameplayPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
