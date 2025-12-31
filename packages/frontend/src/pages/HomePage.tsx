import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');

  const handleCreateGame = () => {
    // TODO: Call API to create game
    const gameId = 'temp-game-id';
    navigate(`/lobby/${gameId}`);
  };

  const handleJoinGame = () => {
    // TODO: Implement game joining logic
    console.log('Join game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hawk-purple to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">HawkOps</h1>
          <p className="text-2xl text-hawk-gold font-semibold mb-2">Rise Above the Chaos</p>
          <p className="text-gray-300 text-lg">
            An ITSM Business Simulation for UW-Whitewater
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="mb-6">
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreateGame}
              disabled={!playerName}
              className="w-full bg-hawk-purple hover:bg-purple-800 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Create New Game
            </button>

            <button
              onClick={handleJoinGame}
              disabled={!playerName}
              className="w-full bg-hawk-gold hover:bg-yellow-500 disabled:bg-gray-400 text-hawk-purple font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Join Existing Game
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Game Overview</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• 2-3 teams, 2-3 members each</li>
              <li>• Team roles: Service Desk, Technical Operations, Management/CAB</li>
              <li>• 75-minute real-time sessions</li>
              <li>• Collaborative problem-solving with AI-powered scenarios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
