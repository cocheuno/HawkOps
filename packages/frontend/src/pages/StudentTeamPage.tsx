import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import IncidentDetailModal from '../components/IncidentDetailModal';
import ImplementationPlanPanel from '../components/ImplementationPlanPanel';
import ChangeRequestPanel from '../components/ChangeRequestPanel';
import CABWorkflowPanel from '../components/CABWorkflowPanel';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface StudentInfo {
  id: string;
  playerId: string;
  name: string;
  email: string;
}

interface TeamInfo {
  id: string;
  name: string;
  role: string;
  score?: number;
}

interface GameInfo {
  id: string;
  name: string;
  status: string;
  currentRound: number;
}

interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  priority: string;
  severity: string;
  status: string;
  slaDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function StudentTeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [game, setGame] = useState<GameInfo | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState<'incidents' | 'plans' | 'changes' | 'cab'>('incidents');

  const token = searchParams.get('token');

  // Store token in localStorage for subsequent requests
  useEffect(() => {
    if (token) {
      localStorage.setItem('studentToken', token);
    }
  }, [token]);

  const getStoredToken = () => {
    return token || localStorage.getItem('studentToken');
  };

  const fetchDashboard = useCallback(async () => {
    const accessToken = getStoredToken();

    if (!accessToken) {
      setError('No access token provided. Please use the link from your email.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/student/team/${teamId}/dashboard`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      setStudent(response.data.student || response.data.currentStudent);
      setTeam(response.data.team);
      setGame(response.data.game);
      setIncidents(response.data.incidents || []);
      setLoading(false);

      // Fetch all teams for CAB workflow
      if (response.data.game?.id) {
        const teamsResponse = await axios.get(`${API_URL}/games/${response.data.game.id}`);
        setTeams(teamsResponse.data.teams || []);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load dashboard';
      const errorCode = err.response?.data?.code;

      if (errorCode === 'TOKEN_EXPIRED') {
        setError('Your access link has expired. Please contact your instructor for a new link.');
      } else if (errorCode === 'TEAM_MISMATCH') {
        setError('You can only access your assigned team. Please use the correct link.');
      } else if (errorCode === 'GAME_ENDED') {
        setError('This game session has ended.');
      } else {
        setError(errorMessage);
      }

      setLoading(false);
    }
  }, [teamId, token]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleStatusChange = async (incidentId: string, newStatus: string) => {
    const accessToken = getStoredToken();

    try {
      await axios.patch(
        `${API_URL}/teams/${teamId}/incidents/${incidentId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success(`Incident status updated to ${newStatus}`);
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your team dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your instructor.
          </p>
        </div>
      </div>
    );
  }

  const isCABTeam = team?.role === 'Management/CAB' || team?.name.toLowerCase().includes('cab');

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />

      {/* Fixed Header - No Navigation */}
      <header className="bg-purple-700 text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">HawkOps ITSM Simulation</h1>
            <p className="text-purple-200 text-sm">{game?.name}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{team?.name}</p>
            <p className="text-purple-200 text-sm">{student?.name}</p>
          </div>
        </div>
      </header>

      {/* Team Info Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Role:</span>
            <span className="font-semibold text-purple-700">{team?.role}</span>
            {team?.score !== undefined && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">Score:</span>
                <span className="font-bold text-purple-700">{team.score}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              game?.status === 'active' ? 'bg-green-100 text-green-800' :
              game?.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {game?.status === 'active' ? 'Game Active' :
               game?.status === 'waiting' ? 'Waiting to Start' :
               game?.status}
            </span>
            {game?.currentRound && (
              <span className="text-sm text-gray-500">Round {game.currentRound}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('incidents')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'incidents'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Incidents ({incidents.filter(i => i.status !== 'closed').length})
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'plans'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Implementation Plans
            </button>
            <button
              onClick={() => setActiveTab('changes')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'changes'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Change Requests
            </button>
            {isCABTeam && (
              <button
                onClick={() => setActiveTab('cab')}
                className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'cab'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                CAB Approvals
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'incidents' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Your Assigned Incidents</h2>

            {incidents.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No incidents assigned to your team yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Incidents will appear here when assigned by the instructor.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono text-gray-500">
                            {incident.incidentNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(incident.priority)}`}>
                            {incident.priority.toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(incident.status)}`}>
                            {incident.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-800">{incident.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {incident.description}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {incident.status === 'open' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(incident.id, 'in_progress');
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Start Work
                          </button>
                        )}
                        {incident.status === 'in_progress' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(incident.id, 'resolved');
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                    {incident.slaDeadline && (
                      <div className="mt-2 text-xs text-gray-500">
                        SLA Deadline: {new Date(incident.slaDeadline).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'plans' && game && (
          <ImplementationPlanPanel
            gameId={game.id}
            teamId={teamId!}
            incidents={incidents.map(i => ({
              id: i.id,
              incidentNumber: i.incidentNumber,
              title: i.title,
              status: i.status,
            }))}
            compact={false}
          />
        )}

        {activeTab === 'changes' && game && (
          <ChangeRequestPanel
            gameId={game.id}
            teamId={teamId!}
            compact={false}
          />
        )}

        {activeTab === 'cab' && isCABTeam && game && (
          <CABWorkflowPanel
            gameId={game.id}
            teamId={teamId!}
            teams={teams}
            isCABTeam={true}
            compact={false}
          />
        )}
      </main>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={{
            ...selectedIncident,
            aiContext: null,
          }}
          onClose={() => setSelectedIncident(null)}
          onStatusChange={(status: string) => {
            handleStatusChange(selectedIncident.id, status);
            setSelectedIncident(null);
          }}
        />
      )}
    </div>
  );
}
