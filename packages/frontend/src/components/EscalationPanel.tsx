import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface EscalationCheck {
  incidentId: string;
  incidentNumber: string;
  title: string;
  priority: string;
  currentLevel: number;
  minutesOpen: number;
  shouldEscalate: boolean;
  nextLevel: number | null;
  rule: any;
}

interface EscalationPanelProps {
  gameId: string;
  teamId?: string;
  isInstructor?: boolean;
  compact?: boolean;
}

export default function EscalationPanel({ gameId, teamId: _teamId, isInstructor = false, compact = false }: EscalationPanelProps) {
  const [escalations, setEscalations] = useState<EscalationCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 30000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchEscalations = async () => {
    try {
      const response = await axios.get(`${API_URL}/games/${gameId}/escalation/check`);
      setEscalations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching escalations:', error);
      setLoading(false);
    }
  };

  const processEscalations = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/games/${gameId}/escalation/process`);
      toast.success(`Processed ${response.data.escalatedCount} escalations`);
      await fetchEscalations();
    } catch (error) {
      console.error('Error processing escalations:', error);
      toast.error('Failed to process escalations');
    } finally {
      setProcessing(false);
    }
  };

  const manualEscalate = async (incidentId: string) => {
    try {
      await axios.post(`${API_URL}/incidents/${incidentId}/escalate`, {
        reason: 'Manual escalation by instructor'
      });
      toast.success('Incident escalated');
      await fetchEscalations();
    } catch (error) {
      console.error('Error escalating:', error);
      toast.error('Failed to escalate incident');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getLevelBadge = (level: number) => {
    if (level === 0) return null;
    const colors = ['', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
    return (
      <span className={`${colors[level] || 'bg-red-600'} text-white text-xs px-2 py-0.5 rounded-full`}>
        L{level}
      </span>
    );
  };

  const needsAttention = escalations.filter(e => e.shouldEscalate);
  const atRisk = escalations.filter(e => !e.shouldEscalate && e.currentLevel > 0);

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
            <span className="text-xl">🚨</span> Escalation Status
          </h3>
          {needsAttention.length > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
              {needsAttention.length} need attention
            </span>
          )}
        </div>

        {needsAttention.length === 0 ? (
          <p className="text-gray-500 text-sm">No escalations pending</p>
        ) : (
          <div className="space-y-2">
            {needsAttention.slice(0, 3).map(esc => (
              <div key={esc.incidentId} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                <div>
                  <span className="font-mono text-sm">{esc.incidentNumber}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getPriorityColor(esc.priority)}`}>
                    {esc.priority}
                  </span>
                </div>
                <span className="text-red-600 text-sm font-semibold">{esc.minutesOpen}m</span>
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
          <h2 className="text-xl font-bold text-gray-800">Escalation Management</h2>
          <p className="text-sm text-gray-500">
            {needsAttention.length} need escalation • {atRisk.length} previously escalated
          </p>
        </div>
        {isInstructor && needsAttention.length > 0 && (
          <button
            onClick={processEscalations}
            disabled={processing}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? (
              <>
                <span className="animate-spin">⏳</span>
                Processing...
              </>
            ) : (
              <>
                ⚡ Process All Escalations
              </>
            )}
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Incidents Needing Escalation */}
        {needsAttention.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Needs Immediate Escalation
            </h3>
            <div className="space-y-3">
              {needsAttention.map(esc => (
                <div
                  key={esc.incidentId}
                  className="border-2 border-red-300 rounded-lg p-4 bg-red-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold">{esc.incidentNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(esc.priority)}`}>
                          {esc.priority.toUpperCase()}
                        </span>
                        {getLevelBadge(esc.currentLevel)}
                      </div>
                      <p className="text-gray-700">{esc.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Open for <span className="font-semibold text-red-600">{esc.minutesOpen} minutes</span>
                        {esc.rule && (
                          <span className="ml-2">• Rule: {esc.rule.name}</span>
                        )}
                      </p>
                    </div>
                    {isInstructor && (
                      <button
                        onClick={() => manualEscalate(esc.incidentId)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Escalate Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previously Escalated */}
        {atRisk.length > 0 && (
          <div>
            <h3 className="font-semibold text-orange-700 mb-3">Previously Escalated</h3>
            <div className="space-y-2">
              {atRisk.map(esc => (
                <div
                  key={esc.incidentId}
                  className="border border-orange-200 rounded-lg p-3 bg-orange-50 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{esc.incidentNumber}</span>
                    {getLevelBadge(esc.currentLevel)}
                    <span className="text-gray-600 text-sm">{esc.title}</span>
                  </div>
                  <span className="text-orange-600 text-sm">{esc.minutesOpen}m open</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {needsAttention.length === 0 && atRisk.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">✓</div>
            <p>No escalation concerns at this time</p>
          </div>
        )}
      </div>
    </div>
  );
}
