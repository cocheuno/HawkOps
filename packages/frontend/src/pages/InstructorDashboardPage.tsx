import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Navigation from '../components/Navigation';
import ServiceHealthDashboard from '../components/ServiceHealthDashboard';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Team {
  id: string;
  name: string;
  role: string;
  score: number;
  budgetRemaining: number;
  moraleLevel: number;
}

interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  priority: string;
  severity: string;
  status: string;
  aiGenerated: boolean;
  createdAt: string;
}

interface AIInteraction {
  id: string;
  agentType: string;
  interactionType: string;
  totalTokens: number;
  latencyMs: number;
  createdAt: string;
}

interface GameState {
  game: {
    id: string;
    name: string;
    status: string;
    scenarioType: string;
    difficultyLevel: number;
    currentRound: number;
    maxRounds: number;
    aiPersonality: string;
    startedAt: string;
    createdAt: string;
  };
  teams: Team[];
  activeIncidents: Incident[];
  technicalDebt: number;
  recentAIInteractions: AIInteraction[];
}

interface Service {
  id: string;
  name: string;
  type: string;
  status: 'operational' | 'degraded' | 'down';
  criticality: number;
  description?: string;
  activeIncidents: number;
}

interface ServiceHealthData {
  total: number;
  operational: number;
  degraded: number;
  down: number;
  healthScore: number;
  services: Service[];
}

interface SLAStatus {
  total: number;
  withinSLA: number;
  breached: number;
  atRisk: number;
}

export default function InstructorDashboardPage() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthData | null>(null);
  const [slaStatus, setSlaStatus] = useState<SLAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [injecting, setInjecting] = useState(false);
  const [showServiceHealth, setShowServiceHealth] = useState(false);
  const [initializingServices, setInitializingServices] = useState(false);

  const fetchGameState = async () => {
    try {
      const response = await axios.get(`${API_URL}/instructor/games/${gameId}/state`);
      setGameState(response.data);
      setLoading(false);

      // Fetch service health and SLA status
      fetchServiceHealth();
      fetchSLAStatus();
    } catch (error: any) {
      console.error('Error fetching game state:', error);
      toast.error('Failed to fetch game state');
      setLoading(false);
    }
  };

  const fetchServiceHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/games/${gameId}/service-health`);
      setServiceHealth(response.data);
    } catch (error: any) {
      console.error('Error fetching service health:', error);
    }
  };

  const fetchSLAStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/instructor/games/${gameId}/sla-status`);
      setSlaStatus(response.data.status);
    } catch (error: any) {
      console.error('Error fetching SLA status:', error);
    }
  };

  const handleInitializeServices = async () => {
    if (!gameId || !gameState) return;
    setInitializingServices(true);
    try {
      await axios.post(`${API_URL}/games/${gameId}/initialize-services`, {
        scenarioType: gameState.game.scenarioType
      });
      toast.success('Services initialized successfully');
      fetchServiceHealth();
    } catch (error: any) {
      console.error('Error initializing services:', error);
      toast.error('Failed to initialize services');
    } finally {
      setInitializingServices(false);
    }
  };

  const handleCheckSLABreaches = async () => {
    try {
      const response = await axios.post(`${API_URL}/instructor/games/${gameId}/check-sla`);
      if (response.data.breachedCount > 0) {
        toast.error(`${response.data.breachedCount} SLA breach(es) detected and processed`);
      } else {
        toast.success('No SLA breaches detected');
      }
      fetchGameState();
    } catch (error: any) {
      console.error('Error checking SLA breaches:', error);
      toast.error('Failed to check SLA breaches');
    }
  };

  useEffect(() => {
    fetchGameState();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchGameState, 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  const handleInjectIncident = async () => {
    if (!gameId) return;

    setInjecting(true);
    try {
      const response = await axios.post(`${API_URL}/instructor/games/${gameId}/inject-incident`);

      if (response.data.success) {
        toast.success(
          `AI Incident Injected: ${response.data.incident.incidentNumber} - ${response.data.incident.title}`,
          { duration: 5000 }
        );

        // Refresh game state
        await fetchGameState();
      }
    } catch (error: any) {
      console.error('Error injecting incident:', error);
      toast.error(error.response?.data?.message || 'Failed to inject AI incident');
    } finally {
      setInjecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading instructor dashboard...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load game state</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation title={`Instructor Dashboard - ${gameState.game.name}`} showBack={false} />
      <div className="max-w-7xl mx-auto px-6 pb-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Instructor Dashboard: {gameState.game.name}
              </h1>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Status: <span className="font-semibold text-hawk-purple">{gameState.game.status}</span></span>
                <span>Round: {gameState.game.currentRound}/{gameState.game.maxRounds}</span>
                <span>Difficulty: {gameState.game.difficultyLevel}/10</span>
                <span>AI Personality: {gameState.game.aiPersonality}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to={`/instructor/game/${gameState.game.id}/ai-generate`}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Generate Scenario
              </Link>
              <Link
                to={`/instructor/game/${gameState.game.id}/documents`}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Briefing Documents
              </Link>
              <button
                onClick={handleInjectIncident}
                disabled={injecting || gameState.game.status === 'completed'}
                className="bg-hawk-purple hover:bg-purple-800 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                {injecting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Inject AI Incident
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Teams Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {gameState.teams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-lg text-gray-800 mb-2">{team.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{team.role}</p>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Score:</span>
                  <span className="font-semibold text-hawk-purple">{team.score}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Budget:</span>
                  <span className="font-semibold">${team.budgetRemaining.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Morale:</span>
                  <span className={`font-semibold ${team.moraleLevel >= 70 ? 'text-green-600' : team.moraleLevel >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {team.moraleLevel}%
                  </span>
                </div>
              </div>
              <Link
                to={`/team/${team.id}`}
                className="block w-full bg-hawk-purple hover:bg-purple-800 text-white text-center font-semibold py-2 px-4 rounded transition-colors"
              >
                View Dashboard
              </Link>
            </div>
          ))}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Active Incidents</h3>
            <p className="text-3xl font-bold text-hawk-purple">{gameState.activeIncidents.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Technical Debt</h3>
            <p className="text-3xl font-bold text-orange-600">{gameState.technicalDebt} pts</p>
          </div>
          {slaStatus && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-1">SLA Status</h3>
              <div className="flex items-center gap-2">
                {slaStatus.breached > 0 ? (
                  <p className="text-2xl font-bold text-red-600">{slaStatus.breached} breached</p>
                ) : slaStatus.atRisk > 0 ? (
                  <p className="text-2xl font-bold text-yellow-600">{slaStatus.atRisk} at risk</p>
                ) : (
                  <p className="text-2xl font-bold text-green-600">All OK</p>
                )}
              </div>
              <button
                onClick={handleCheckSLABreaches}
                className="text-xs text-hawk-purple hover:underline mt-1"
              >
                Check Now
              </button>
            </div>
          )}
          {serviceHealth && (
            <div
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setShowServiceHealth(!showServiceHealth)}
            >
              <h3 className="text-sm font-semibold text-gray-600 mb-1">System Health</h3>
              <div className="flex items-center gap-2">
                <p className={`text-3xl font-bold ${
                  serviceHealth.healthScore >= 90 ? 'text-green-600' :
                  serviceHealth.healthScore >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>{serviceHealth.healthScore}%</p>
              </div>
              <div className="flex gap-1 text-xs mt-1">
                <span className="text-green-600">{serviceHealth.operational}</span>
                <span className="text-yellow-600">{serviceHealth.degraded}</span>
                <span className="text-red-600">{serviceHealth.down}</span>
              </div>
            </div>
          )}
          {!serviceHealth || serviceHealth.total === 0 ? (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Services</h3>
              <button
                onClick={handleInitializeServices}
                disabled={initializingServices}
                className="text-sm bg-hawk-purple hover:bg-purple-800 disabled:bg-gray-400 text-white px-3 py-2 rounded transition-colors"
              >
                {initializingServices ? 'Initializing...' : 'Initialize Services'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-1">AI Interactions</h3>
              <p className="text-3xl font-bold text-blue-600">{gameState.recentAIInteractions.length}</p>
            </div>
          )}
        </div>

        {/* Service Health Dashboard (collapsible) */}
        {showServiceHealth && serviceHealth && serviceHealth.services.length > 0 && (
          <div className="mb-6">
            <ServiceHealthDashboard
              services={serviceHealth.services}
              compact={false}
            />
          </div>
        )}

        {/* Active Incidents */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Active Incidents</h2>
          </div>
          <div className="p-4">
            {gameState.activeIncidents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active incidents</p>
            ) : (
              <div className="space-y-3">
                {gameState.activeIncidents.map((incident) => (
                  <div key={incident.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-700">
                          {incident.incidentNumber}
                        </span>
                        {incident.aiGenerated && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            AI Generated
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${
                          incident.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          incident.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          incident.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {incident.priority.toUpperCase()}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold">
                          {incident.severity}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">{incident.title}</h4>
                    <p className="text-sm text-gray-600">Status: {incident.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent AI Interactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Recent AI Interactions</h2>
          </div>
          <div className="p-4">
            {gameState.recentAIInteractions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No AI interactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Agent Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Interaction</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Tokens</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Latency</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {gameState.recentAIInteractions.map((interaction) => (
                      <tr key={interaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-800">{interaction.agentType}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{interaction.interactionType}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{interaction.totalTokens.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{interaction.latencyMs}ms</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {new Date(interaction.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
