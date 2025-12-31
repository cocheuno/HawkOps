import { useParams } from 'react-router-dom';

export default function GameplayPage() {
  const { gameId } = useParams();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="bg-hawk-purple p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">HawkOps</h1>
          <div className="text-sm">
            <span className="mr-4">Time: 75:00</span>
            <span>Game ID: {gameId}</span>
          </div>
        </header>

        {/* Main game area */}
        <div className="flex-1 grid grid-cols-4 gap-4 p-4">
          {/* Left sidebar - Team info */}
          <div className="col-span-1 bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Team Dashboard</h2>
            {/* TODO: Team metrics, members, objectives */}
          </div>

          {/* Center - Main gameplay area */}
          <div className="col-span-2 bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Incidents & Actions</h2>
            {/* TODO: Incident list, action interface */}
          </div>

          {/* Right sidebar - Chat & Activity */}
          <div className="col-span-1 bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Team Chat</h2>
            {/* TODO: Real-time chat, activity feed */}
          </div>
        </div>
      </div>
    </div>
  );
}
