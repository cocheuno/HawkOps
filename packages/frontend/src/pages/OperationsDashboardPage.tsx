import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Team {
  id: string;
  name: string;
  role: string;
  score: number;
  budgetRemaining: number;
  moraleLevel: number;
}

interface Game {
  id: string;
  name: string;
  status: string;
  currentRound: number;
  maxRounds: number;
  difficultyLevel: number;
}

interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  priority: string;
  severity: string;
  status: string;
  createdAt: string;
  slaDeadline: string;
  estimatedCostPerMinute: number;
  totalCost: number;
  aiGenerated: boolean;
  aiContext?: any;
}

interface DashboardData {
  team: Team;
  game: Game;
  incidents: Incident[];
  activeIncidentCount: number;
  technicalDebt: any[];
}

export default function OperationsDashboardPage() {
  const { teamId } = useParams();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/teams/${teamId}/dashboard`);
      setDashboardData(response.data);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [teamId]);

  const handleStatusChange = async (incidentId: string, newStatus: string) => {
    if (!teamId) return;

    setUpdating(true);
    try {
      await axios.patch(`${API_URL}/teams/${teamId}/incidents/${incidentId}/status`, {
        status: newStatus,
      });

      toast.success(`Incident status updated to ${newStatus}`);
      await fetchDashboard();

      // Close modal if incident was resolved/closed
      if (newStatus === 'resolved' || newStatus === 'closed') {
        setSelectedIncident(null);
      }
    } catch (error: any) {
      console.error('Error updating incident:', error);
      toast.error(error.response?.data?.error || 'Failed to update incident');
    } finally {
      setUpdating(false);
    }
  };

  const calculateTimeRemaining = (slaDeadline: string) => {
    const now = new Date();
    const deadline = new Date(slaDeadline);
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs < 0) return 'SLA BREACHED';

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load dashboard</div>
      </div>
    );
  }

  const { team, game, incidents, activeIncidentCount, technicalDebt } = dashboardData;

  // DEBUG: Log selected incident state every render
  console.log('RENDER - selectedIncident:', selectedIncident);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Team Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{team.name}</h1>
              <p className="text-gray-600 mb-4">{team.role}</p>
              <div className="flex gap-6">
                <div>
                  <span className="text-sm text-gray-600">Score</span>
                  <p className="text-2xl font-bold text-hawk-purple">{team.score}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Budget</span>
                  <p className="text-2xl font-bold text-green-600">${team.budgetRemaining.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Morale</span>
                  <p className={`text-2xl font-bold ${
                    team.moraleLevel >= 70 ? 'text-green-600' :
                    team.moraleLevel >= 40 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>{team.moraleLevel}%</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{game.name}</p>
              <p className="text-sm text-gray-500">Round {game.currentRound}/{game.maxRounds}</p>
              <p className="text-sm text-gray-500 mt-2">Difficulty: {game.difficultyLevel}/10</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Active Incidents</h3>
            <p className="text-3xl font-bold text-hawk-purple">{activeIncidentCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Total Incidents</h3>
            <p className="text-3xl font-bold text-blue-600">{incidents.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Technical Debt</h3>
            <p className="text-3xl font-bold text-orange-600">{technicalDebt.length}</p>
          </div>
        </div>

        {/* Incident Queue */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Incident Queue</h2>
          </div>
          <div className="p-4">
            {incidents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No incidents assigned to your team</p>
                <p className="text-sm text-gray-400 mt-2">When incidents are assigned, they'll appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => {
                  const timeRemaining = calculateTimeRemaining(incident.slaDeadline);
                  const isSlaBreached = timeRemaining === 'SLA BREACHED';

                  return (
                    <div
                      key={incident.id}
                      onClick={() => {
                        console.log('INCIDENT CLICKED:', incident.incidentNumber, incident);
                        console.log('Setting selectedIncident...');
                        setSelectedIncident(incident);
                        console.log('selectedIncident set');
                      }}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
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
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(incident.status)}`}>
                            {incident.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-1 rounded border font-semibold ${getPriorityColor(incident.priority)}`}>
                            {incident.priority.toUpperCase()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                            isSlaBreached ? 'bg-red-600 text-white' : 'bg-green-100 text-green-700'
                          }`}>
                            {timeRemaining}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-1">{incident.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{incident.description}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>Cost: ${incident.estimatedCostPerMinute}/min</span>
                        <span>Created: {new Date(incident.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div
          onClick={() => {
            console.log('Overlay clicked - closing modal');
            setSelectedIncident(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999
          }}
        >
          {/* DEBUG: Bright red test box */}
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: '50px',
              width: '200px',
              height: '200px',
              backgroundColor: '#ff0000',
              color: '#ffffff',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              border: '5px solid yellow'
            }}
          >
            TEST BOX
          </div>

          <div
            onClick={(e) => {
              console.log('Modal content clicked - should NOT close');
              e.stopPropagation();
            }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              color: '#1f2937',
              border: '10px solid #00ff00'
            }}
          >
            {/* Header */}
            <div style={{
              backgroundColor: '#4B2E83',
              color: '#ffffff',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px'
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>
                  {selectedIncident.incidentNumber}
                </h2>
                <p style={{ fontSize: '14px', margin: '4px 0 0 0', color: '#ffffff' }}>
                  {selectedIncident.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: '8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', color: '#1f2937' }}>
              {/* Status Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span style={{ padding: '8px 12px', borderRadius: '4px', fontWeight: '600', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                  Priority: {selectedIncident.priority.toUpperCase()}
                </span>
                <span style={{ padding: '8px 12px', borderRadius: '4px', fontWeight: '600', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                  Status: {selectedIncident.status.replace('_', ' ').toUpperCase()}
                </span>
                <span style={{ padding: '8px 12px', borderRadius: '4px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#374151' }}>
                  Severity: {selectedIncident.severity}
                </span>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>Description</h3>
                <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{selectedIncident.description || 'No description available'}</p>
              </div>

              {/* SLA Info */}
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <h3 style={{ fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>SLA Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '14px', color: '#4b5563', display: 'block' }}>Time Remaining</span>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#4B2E83', margin: '4px 0 0 0' }}>
                      {calculateTimeRemaining(selectedIncident.slaDeadline)}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', color: '#4b5563', display: 'block' }}>Deadline</span>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '4px 0 0 0' }}>
                      {new Date(selectedIncident.slaDeadline).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', color: '#4b5563', display: 'block' }}>Est. Cost/Min</span>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#ea580c', margin: '4px 0 0 0' }}>
                      ${selectedIncident.estimatedCostPerMinute}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', color: '#4b5563', display: 'block' }}>Total Cost</span>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', margin: '4px 0 0 0' }}>
                      ${selectedIncident.totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Context (if available) */}
              {selectedIncident.aiGenerated && selectedIncident.aiContext && (
                <div style={{ backgroundColor: '#faf5ff', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                  <h3 style={{ fontWeight: '600', color: '#581c87', marginBottom: '8px' }}>AI Insights</h3>
                  {selectedIncident.aiContext.teachingPoint && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#7e22ce' }}>Teaching Point:</span>
                      <p style={{ fontSize: '14px', color: '#581c87', margin: '4px 0 0 0' }}>{selectedIncident.aiContext.teachingPoint}</p>
                    </div>
                  )}
                  {selectedIncident.aiContext.affectedService && (
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#7e22ce' }}>Affected Service:</span>
                      <p style={{ fontSize: '14px', color: '#581c87', margin: '4px 0 0 0' }}>{selectedIncident.aiContext.affectedService}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                {selectedIncident.status === 'open' && (
                  <button
                    onClick={() => handleStatusChange(selectedIncident.id, 'in_progress')}
                    disabled={updating}
                    style={{
                      flex: 1,
                      backgroundColor: updating ? '#9ca3af' : '#eab308',
                      color: '#ffffff',
                      fontWeight: '600',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: updating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {updating ? 'Updating...' : 'Start Working'}
                  </button>
                )}
                {selectedIncident.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(selectedIncident.id, 'resolved')}
                    disabled={updating}
                    style={{
                      flex: 1,
                      backgroundColor: updating ? '#9ca3af' : '#22c55e',
                      color: '#ffffff',
                      fontWeight: '600',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: updating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {updating ? 'Updating...' : 'Mark as Resolved'}
                  </button>
                )}
                {selectedIncident.status === 'resolved' && (
                  <button
                    onClick={() => handleStatusChange(selectedIncident.id, 'closed')}
                    disabled={updating}
                    style={{
                      flex: 1,
                      backgroundColor: updating ? '#9ca3af' : '#6b7280',
                      color: '#ffffff',
                      fontWeight: '600',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: updating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {updating ? 'Updating...' : 'Close Incident'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedIncident(null)}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
