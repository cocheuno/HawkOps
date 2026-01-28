import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import CreateGameModal from '../Components/CreateGameModal';
import { gameApi } from '../services/api';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface SavedGame {
  id: string;
  name: string;
  status: string;
  playerCount: number;
  teamCount: number;
  currentRound: number;
  maxRounds: number;
  startedAt: string | null;
  createdAt: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<'instructor' | 'student' | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [aiModelInfo, setAiModelInfo] = useState<{ provider: string; model: string } | null>(null);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);

  // Fetch saved games for instructor
  const fetchSavedGames = async () => {
    setLoadingGames(true);
    try {
      const response = await axios.get(`${API_URL}/games/all`);
      setSavedGames(response.data.games || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoadingGames(false);
    }
  };

  // Fetch AI model info
  const fetchAIModelInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/config/ai-info`);
      setAiModelInfo(response.data);
    } catch (error) {
      console.error('Error fetching AI info:', error);
    }
  };

  // Delete a game
  const handleDeleteGame = async (gameId: string, gameName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${gameName}"? This will permanently remove the game and all associated data.`)) {
      return;
    }
    setDeletingGameId(gameId);
    try {
      await axios.delete(`${API_URL}/games/${gameId}`);
      toast.success(`Game "${gameName}" deleted successfully`);
      setSavedGames(prev => prev.filter(g => g.id !== gameId));
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to delete game';
      toast.error(msg);
    } finally {
      setDeletingGameId(null);
    }
  };

  // Check if previously logged in
  useEffect(() => {
    const savedRole = localStorage.getItem('hawkops_role');
    const savedEmail = localStorage.getItem('hawkops_email');
    const savedToken = localStorage.getItem('hawkops_token');
    if (savedRole && savedEmail && savedToken) {
      setRole(savedRole as 'instructor' | 'student');
      setEmail(savedEmail);
      setLoggedIn(true);
      if (savedRole === 'instructor') {
        fetchSavedGames();
        fetchAIModelInfo();
      }
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setLoggingIn(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: email.trim(),
      });

      const data = response.data;
      localStorage.setItem('hawkops_role', data.role);
      localStorage.setItem('hawkops_email', data.email);
      localStorage.setItem('hawkops_token', data.token);

      if (data.role === 'instructor') {
        setRole('instructor');
        setLoggedIn(true);
        toast.success('Welcome, Instructor!');
        fetchSavedGames();
        fetchAIModelInfo();

        // If there's an active game, offer to navigate to it
        if (data.activeGame) {
          navigate(`/instructor/${data.activeGame.id}`);
        }
      } else if (data.role === 'student') {
        // Student - go directly to their team page
        localStorage.setItem('studentToken', data.token);
        toast.success(`Welcome, ${data.student.name}! Joining ${data.team.name}...`);
        navigate(`/student/team/${data.team.id}?token=${data.token}`);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Login failed. Please check your email.';
      toast.error(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hawkops_role');
    localStorage.removeItem('hawkops_email');
    localStorage.removeItem('hawkops_token');
    localStorage.removeItem('studentToken');
    setLoggedIn(false);
    setRole(null);
    setEmail('');
    setSavedGames([]);
  };

  const handleCreateGame = () => {
    setShowCreateModal(true);
  };

  const handleCreateGameSubmit = async (gameData: {
    gameName: string;
    facilitatorName: string;
    durationMinutes: number;
    teams: Array<{ name: string; role: string }>;
  }) => {
    try {
      const response = await gameApi.createGame(gameData);
      toast.success(`Game "${response.game.name}" created successfully!`);
      setShowCreateModal(false);
      navigate(`/instructor/${response.game.id}`);
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast.error(error.response?.data?.error || 'Failed to create game. Please try again.');
    }
  };

  const handleJoinGame = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email first');
      return;
    }

    setLoggingIn(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: email.trim(),
      });

      const data = response.data;

      if (data.role === 'student') {
        localStorage.setItem('hawkops_role', 'student');
        localStorage.setItem('hawkops_email', data.email);
        localStorage.setItem('hawkops_token', data.token);
        localStorage.setItem('studentToken', data.token);
        toast.success(`Joining ${data.team.name}...`);
        navigate(`/student/team/${data.team.id}?token=${data.token}`);
      } else if (data.role === 'instructor') {
        toast('You are the instructor. Use "Sign In" to access the instructor dashboard.');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Could not find your game assignment. Please ask your instructor to add you.';
      toast.error(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleResumeGame = (gameId: string) => {
    navigate(`/instructor/${gameId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'lobby': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Not logged in - show login form
  if (!loggedIn) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-hawk-purple to-purple-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-6xl font-bold text-white mb-4">HawkOps</h1>
              <p className="text-2xl text-hawk-gold font-semibold mb-2">Rise Above the Chaos</p>
              <p className="text-gray-300 text-lg">An ITSM Business Simulation for UW-Whitewater</p>
            </div>
            <div className="bg-white rounded-lg shadow-2xl p-8">
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-transparent text-gray-900"
                  placeholder="Enter your UWW email"
                />
              </div>
              <div className="space-y-4">
                <button
                  onClick={handleLogin}
                  disabled={!email.trim() || loggingIn}
                  className="w-full bg-hawk-purple hover:bg-purple-800 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {loggingIn ? 'Signing in...' : 'Sign In'}
                </button>
                <button
                  onClick={handleJoinGame}
                  disabled={!email.trim() || loggingIn}
                  className="w-full bg-hawk-gold hover:bg-yellow-500 disabled:bg-gray-400 text-hawk-purple font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {loggingIn ? 'Joining...' : 'Join Game'}
                </button>
              </div>
              <div className="mt-6 text-center text-sm text-gray-500">
                <p>Instructor: Sign in with your instructor email</p>
                <p>Student: Enter your email and click "Join Game"</p>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3">Game Overview</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>- 2-3 teams, 2-3 members each</li>
                  <li>- Team roles: Service Desk, Technical Operations, Management/CAB</li>
                  <li>- 75-minute real-time sessions</li>
                  <li>- Collaborative problem-solving with AI-powered scenarios</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Logged in as instructor - show instructor dashboard home
  if (role === 'instructor') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-hawk-purple to-purple-900 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-white mb-2">HawkOps</h1>
              <p className="text-xl text-hawk-gold font-semibold">Instructor Dashboard</p>
            </div>

            {/* Instructor Controls */}
            <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Welcome, Instructor</h2>
                  <p className="text-sm text-gray-500">{email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded"
                >
                  Sign Out
                </button>
              </div>

              {aiModelInfo && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">AI Provider:</span>{' '}
                    <span className="font-bold">{aiModelInfo.provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}</span>{' '}
                    <span className="text-blue-600">({aiModelInfo.model})</span>
                  </p>
                </div>
              )}

              <button
                onClick={handleCreateGame}
                className="w-full bg-hawk-purple hover:bg-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
              >
                Create New Game
              </button>
            </div>

            {/* Saved Games */}
            <div className="bg-white rounded-lg shadow-2xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Your Games</h3>

              {loadingGames ? (
                <p className="text-gray-500 text-center py-4">Loading games...</p>
              ) : savedGames.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No games yet. Create a new game to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {savedGames.map((game) => (
                    <div
                      key={game.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{game.name}</h4>
                          <div className="flex gap-2 mt-1 text-sm text-gray-500">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(game.status)}`}>
                              {game.status.toUpperCase()}
                            </span>
                            <span>{game.teamCount} teams</span>
                            {game.currentRound && <span>Round {game.currentRound}/{game.maxRounds || '?'}</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Created {new Date(game.createdAt).toLocaleDateString()}
                            {game.startedAt && ` - Started ${new Date(game.startedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResumeGame(game.id)}
                            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                              game.status === 'completed'
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-hawk-purple text-white hover:bg-purple-800'
                            }`}
                          >
                            {game.status === 'paused' ? 'Resume' :
                             game.status === 'completed' ? 'View Results' :
                             game.status === 'lobby' ? 'Set Up' :
                             'Manage'}
                          </button>
                          <button
                            onClick={() => handleDeleteGame(game.id, game.name)}
                            disabled={deletingGameId === game.id || game.status === 'active'}
                            title={game.status === 'active' ? 'End or pause the game before deleting' : 'Delete game'}
                            className="px-3 py-2 rounded text-sm font-semibold transition-colors bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingGameId === game.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <CreateGameModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGameSubmit}
          facilitatorName="Instructor"
        />
      </>
    );
  }

  // Fallback (shouldn't happen - students are redirected immediately)
  return null;
}
