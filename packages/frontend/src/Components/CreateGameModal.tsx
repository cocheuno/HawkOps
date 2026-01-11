import { useState } from 'react';
import { X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  role: 'Service Desk' | 'Technical Operations' | 'Management/CAB';
}

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (gameData: {
    gameName: string;
    facilitatorName: string;
    durationMinutes: number;
    teams: Array<{ name: string; role: string }>;
  }) => void;
  facilitatorName: string;
}

const TEAM_ROLES = [
  { value: 'Service Desk', label: 'Service Desk', description: 'First point of contact, triage & escalation' },
  { value: 'Technical Operations', label: 'Technical Operations', description: 'Deep investigation & resolution' },
  { value: 'Management/CAB', label: 'Management/CAB', description: 'Strategic oversight & change approval' }
];

export default function CreateGameModal({ isOpen, onClose, onSubmit, facilitatorName }: CreateGameModalProps) {
  const [gameName, setGameName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(75);
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'Team Alpha', role: 'Service Desk' },
    { id: '2', name: 'Team Bravo', role: 'Technical Operations' }
  ]);

  if (!isOpen) return null;

  const handleAddTeam = () => {
    if (teams.length < 3) {
      const newId = (Math.max(...teams.map(t => parseInt(t.id))) + 1).toString();
      setTeams([...teams, { id: newId, name: `Team ${String.fromCharCode(65 + teams.length)}`, role: 'Management/CAB' }]);
    }
  };

  const handleRemoveTeam = (id: string) => {
    if (teams.length > 2) {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  const handleTeamNameChange = (id: string, name: string) => {
    setTeams(teams.map(t => t.id === id ? { ...t, name } : t));
  };

  const handleTeamRoleChange = (id: string, role: Team['role']) => {
    setTeams(teams.map(t => t.id === id ? { ...t, role } : t));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ gameName, facilitatorName, durationMinutes, teams: teams.map(t => ({ name: t.name, role: t.role })) });
  };

  const isValid = gameName.trim() !== '' && teams.length >= 2;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-hawk-purple text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-2xl font-bold">Create New Game</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="gameName" className="block text-sm font-medium text-gray-700 mb-2">Game Name *</label>
            <input type="text" id="gameName" value={gameName} onChange={(e) => setGameName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-transparent" placeholder="e.g., ITSM Training Session 1" required />
          </div>
          <div>
            <label htmlFor="facilitatorName" className="block text-sm font-medium text-gray-700 mb-2">Facilitator Name</label>
            <input type="text" id="facilitatorName" value={facilitatorName} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
            <p className="text-sm text-gray-500 mt-1">You will be the game facilitator</p>
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">Game Duration (minutes)</label>
            <div className="flex items-center space-x-4">
              <input type="range" id="duration" min="30" max="120" step="15" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value))} className="flex-1" />
              <span className="text-lg font-semibold text-hawk-purple w-16 text-right">{durationMinutes}m</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30 min</span>
              <span>120 min</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Teams Configuration * (2-3 teams required)</label>
              {teams.length < 3 && (
                <button type="button" onClick={handleAddTeam} className="text-sm text-hawk-purple hover:text-purple-800 font-medium">+ Add Team</button>
              )}
            </div>
            <div className="space-y-4">
              {teams.map((team, index) => (
                <div key={team.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">Team {index + 1}</h4>
                    {teams.length > 2 && (
                      <button type="button" onClick={() => handleRemoveTeam(team.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Team Name</label>
                      <input type="text" value={team.name} onChange={(e) => handleTeamNameChange(team.id, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-transparent" placeholder="Enter team name" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Team Role</label>
                      <select value={team.role} onChange={(e) => handleTeamRoleChange(team.id, e.target.value as Team['role'])} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-transparent" required>
                        {TEAM_ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">{TEAM_ROLES.find(r => r.value === team.role)?.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-3">Each team will have 2-3 members who can join once the game is created.</p>
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={!isValid} className="px-6 py-2 bg-hawk-purple hover:bg-purple-800 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors">Create Game</button>
          </div>
        </form>
      </div>
    </div>
  );
}

