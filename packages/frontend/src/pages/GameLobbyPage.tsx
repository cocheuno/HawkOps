import { useParams } from 'react-router-dom';

export default function GameLobbyPage() {
  const { gameId } = useParams();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Game Lobby</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Game ID: {gameId}</p>
          <p className="text-gray-500 mt-4">Waiting for players to join...</p>
          {/* TODO: Add team selection, player list, ready status */}
        </div>
      </div>
    </div>
  );
}
