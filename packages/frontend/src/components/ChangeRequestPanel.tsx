import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface ChangeRequest {
  id: string;
  changeNumber: string;
  title: string;
  description: string;
  changeType: string;
  riskLevel: string;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  requestedByTeamId: string | null;
  implementationPlan: string | null;
  rollbackPlan: string | null;
}

interface ChangeRequestPanelProps {
  gameId: string;
  teamId?: string;
  isInstructor?: boolean;
  compact?: boolean;
}

export default function ChangeRequestPanel({ gameId, teamId, isInstructor = false, compact = false }: ChangeRequestPanelProps) {
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [implementing, setImplementing] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    changeType: 'normal',
    riskLevel: 'medium',
    implementationPlan: '',
    rollbackPlan: '',
    testPlan: ''
  });

  useEffect(() => {
    fetchChanges();
    const interval = setInterval(fetchChanges, 30000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchChanges = async () => {
    try {
      const response = await axios.get(`${API_URL}/games/${gameId}/changes`);
      setChanges(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching changes:', error);
      setChanges([]);
      setLoading(false);
    }
  };

  const createChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      toast.error('Team ID required');
      return;
    }

    try {
      await axios.post(`${API_URL}/games/${gameId}/changes`, {
        ...formData,
        requestedByTeamId: teamId
      });
      toast.success('Change request created');
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        changeType: 'normal',
        riskLevel: 'medium',
        implementationPlan: '',
        rollbackPlan: '',
        testPlan: ''
      });
      await fetchChanges();
    } catch (error) {
      console.error('Error creating change:', error);
      toast.error('Failed to create change request');
    }
  };

  const approveChange = async (changeId: string, decision: 'approved' | 'rejected') => {
    if (!teamId) return;
    try {
      await axios.post(`${API_URL}/changes/${changeId}/approve`, {
        approverTeamId: teamId,
        decision,
        comments: decision === 'approved' ? 'Approved by instructor' : 'Rejected by instructor'
      });
      toast.success(`Change ${decision}`);
      await fetchChanges();
    } catch (error) {
      console.error('Error approving change:', error);
      toast.error('Failed to update change');
    }
  };

  const implementChange = async (changeId: string) => {
    setImplementing(changeId);
    try {
      const response = await axios.post(`${API_URL}/changes/${changeId}/implement`);
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
      await fetchChanges();
    } catch (error) {
      console.error('Error implementing change:', error);
      toast.error('Failed to implement change');
    } finally {
      setImplementing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-200 text-green-900';
      case 'failed': return 'bg-red-200 text-red-900';
      case 'rolled_back': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return '🚨';
      case 'standard': return '📋';
      default: return '🔄';
    }
  };

  const pendingChanges = changes.filter(c => c.status === 'pending');
  const approvedChanges = changes.filter(c => c.status === 'approved');
  const inProgressChanges = changes.filter(c => c.status === 'in_progress');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded"></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">📝</span> Change Requests
          </h3>
          <span className="text-sm text-gray-500">
            {pendingChanges.length} pending • {approvedChanges.length} ready
          </span>
        </div>

        {inProgressChanges.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
            <span className="text-blue-700 text-sm font-semibold">
              🔄 {inProgressChanges.length} change(s) in progress
            </span>
          </div>
        )}

        {changes.length === 0 ? (
          <p className="text-gray-500 text-sm">No change requests</p>
        ) : (
          <div className="space-y-2">
            {changes.slice(0, 3).map(change => (
              <div key={change.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <span>{getTypeIcon(change.changeType)}</span>
                  <span className="font-mono text-sm">{change.changeNumber}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(change.status)}`}>
                  {change.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Change Management</h2>
          <p className="text-sm text-gray-500">
            {pendingChanges.length} pending • {approvedChanges.length} approved • {inProgressChanges.length} in progress
          </p>
        </div>
        {teamId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-hawk-purple hover:bg-purple-800 text-white px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancel' : '+ New Change Request'}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="p-4 bg-gray-50 border-b">
          <form onSubmit={createChange} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.changeType}
                    onChange={(e) => setFormData({ ...formData, changeType: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="standard">Standard</option>
                    <option value="normal">Normal</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk</label>
                  <select
                    value={formData.riskLevel}
                    onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border rounded"
                rows={2}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Implementation Plan</label>
                <textarea
                  value={formData.implementationPlan}
                  onChange={(e) => setFormData({ ...formData, implementationPlan: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  rows={2}
                  placeholder="Optional - reduces failure risk"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rollback Plan</label>
                <textarea
                  value={formData.rollbackPlan}
                  onChange={(e) => setFormData({ ...formData, rollbackPlan: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  rows={2}
                  placeholder="Optional - enables rollback on failure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Plan</label>
                <textarea
                  value={formData.testPlan}
                  onChange={(e) => setFormData({ ...formData, testPlan: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  rows={2}
                  placeholder="Optional - reduces failure risk"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-hawk-purple hover:bg-purple-800 text-white px-4 py-2 rounded"
            >
              Submit Change Request
            </button>
          </form>
        </div>
      )}

      <div className="p-4">
        {/* Pending Approval */}
        {pendingChanges.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-yellow-700 mb-3">Pending Approval</h3>
            <div className="space-y-3">
              {pendingChanges.map(change => (
                <div key={change.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{getTypeIcon(change.changeType)}</span>
                        <span className="font-mono font-semibold">{change.changeNumber}</span>
                        <span className={`font-semibold ${getRiskColor(change.riskLevel)}`}>
                          {change.riskLevel.toUpperCase()} Risk
                        </span>
                      </div>
                      <p className="font-medium text-gray-800">{change.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{change.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        {change.implementationPlan && <span>✓ Impl Plan</span>}
                        {change.rollbackPlan && <span>✓ Rollback</span>}
                      </div>
                    </div>
                    {isInstructor && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveChange(change.id, 'approved')}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => approveChange(change.id, 'rejected')}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved - Ready to Implement */}
        {approvedChanges.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-green-700 mb-3">Ready to Implement</h3>
            <div className="space-y-3">
              {approvedChanges.map(change => (
                <div key={change.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span>{getTypeIcon(change.changeType)}</span>
                      <div>
                        <span className="font-mono font-semibold">{change.changeNumber}</span>
                        <span className="ml-2 text-gray-700">{change.title}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => implementChange(change.id)}
                      disabled={implementing === change.id}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      {implementing === change.id ? 'Implementing...' : 'Implement'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In Progress */}
        {inProgressChanges.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-blue-700 mb-3">In Progress</h3>
            <div className="space-y-2">
              {inProgressChanges.map(change => (
                <div key={change.id} className="border border-blue-200 rounded-lg p-3 bg-blue-50 flex items-center gap-3">
                  <span className="animate-spin">🔄</span>
                  <span className="font-mono">{change.changeNumber}</span>
                  <span className="text-gray-700">{change.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Completed */}
        {changes.filter(c => ['completed', 'failed', 'rolled_back'].includes(c.status)).length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Recently Completed</h3>
            <div className="space-y-2">
              {changes.filter(c => ['completed', 'failed', 'rolled_back'].includes(c.status)).slice(0, 5).map(change => (
                <div key={change.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{change.changeNumber}</span>
                    <span className="text-gray-600 text-sm">{change.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(change.status)}`}>
                    {change.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {changes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>No change requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
