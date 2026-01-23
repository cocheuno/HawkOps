import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Snapshot {
  id: string;
  roundNumber: number;
  totalIncidents: number;
  resolvedIncidents: number;
  breachedSlas: number;
  totalScore: number;
  systemHealthScore: number;
  avgResolutionTimeMinutes: number | null;
  totalCostIncurred: number;
  createdAt: string;
}

interface TeamMetric {
  name: string;
  displayName: string;
  value: number;
  unit: string;
  benchmark: number;
  performance: 'above' | 'at' | 'below';
}

interface TeamMetricSummary {
  teamId: string;
  teamName: string;
  metrics: TeamMetric[];
  overallScore: number;
}

interface LearningProgress {
  skillArea: string;
  proficiencyLevel: number;
  demonstratedCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface TeamComparison {
  team: {
    id: string;
    name: string;
    score: number;
    budgetRemaining: number;
    moraleLevel: number;
  };
  metrics: TeamMetricSummary;
  learningProgress: LearningProgress[];
}

interface AnalyticsDashboardProps {
  gameId: string;
  teamId?: string;
  isInstructor?: boolean;
}

export default function AnalyticsDashboard({ gameId, teamId: _teamId, isInstructor = false }: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [teamComparison, setTeamComparison] = useState<TeamComparison[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'learning' | 'trends'>('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchAnalytics = async () => {
    try {
      const [dashboardRes, comparisonRes] = await Promise.all([
        axios.get(`${API_URL}/games/${gameId}/analytics`),
        axios.get(`${API_URL}/games/${gameId}/analytics/comparison`)
      ]);
      setDashboardData(dashboardRes.data || null);
      setTeamComparison(Array.isArray(comparisonRes.data) ? comparisonRes.data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setDashboardData(null);
      setTeamComparison([]);
      setLoading(false);
    }
  };

  const captureSnapshot = async () => {
    try {
      await axios.post(`${API_URL}/games/${gameId}/analytics/snapshot`, {
        snapshotType: 'periodic'
      });
      toast.success('Snapshot captured');
      fetchAnalytics();
    } catch (error) {
      console.error('Error capturing snapshot:', error);
      toast.error('Failed to capture snapshot');
    }
  };

  const exportAnalytics = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API_URL}/games/${gameId}/analytics/export`);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${gameId}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Analytics exported');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast.error('Failed to export analytics');
    } finally {
      setExporting(false);
    }
  };

  const generateReport = async () => {
    try {
      const response = await axios.get(`${API_URL}/games/${gameId}/analytics/report`);
      toast.success('Report generated');
      console.log('Report:', response.data);
      // Could open in new tab or download
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <span className="text-green-500">↑</span>;
      case 'down': return <span className="text-red-500">↓</span>;
      default: return <span className="text-gray-400">→</span>;
    }
  };

  const getPerformanceColor = (performance: 'above' | 'at' | 'below') => {
    switch (performance) {
      case 'above': return 'text-green-600 bg-green-50';
      case 'at': return 'text-yellow-600 bg-yellow-50';
      case 'below': return 'text-red-600 bg-red-50';
    }
  };

  const getProficiencyStars = (level: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={`text-sm ${i < level ? 'text-yellow-500' : 'text-gray-300'}`}
      >
        ★
      </span>
    ));
  };

  const formatSkillArea = (skill: string) => {
    return skill.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const currentState = dashboardData?.currentState;
  const trends = dashboardData?.trends;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
            <p className="text-sm text-gray-500">Performance metrics, team comparison, and learning progress</p>
          </div>
          {isInstructor && (
            <div className="flex gap-2">
              <button
                onClick={captureSnapshot}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm"
              >
                📸 Capture Snapshot
              </button>
              <button
                onClick={generateReport}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm"
              >
                📊 Generate Report
              </button>
              <button
                onClick={exportAnalytics}
                disabled={exporting}
                className="bg-hawk-purple hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : '📥 Export Data'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          {(['overview', 'metrics', 'learning', 'trends'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-hawk-purple text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Total Score</p>
                    <p className="text-3xl font-bold text-purple-800">{currentState?.totalScore ?? 0}</p>
                  </div>
                  {trends && getTrendIcon(trends.scoreTrend)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-green-600 font-medium">System Health</p>
                    <p className="text-3xl font-bold text-green-800">{(currentState?.systemHealthScore ?? 100).toFixed(1)}%</p>
                  </div>
                  {trends && getTrendIcon(trends.systemHealthTrend)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Incidents Resolved</p>
                  <p className="text-3xl font-bold text-blue-800">
                    {currentState?.resolvedIncidents ?? 0}/{currentState?.totalIncidents ?? 0}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                <div>
                  <p className="text-sm text-red-600 font-medium">SLA Breaches</p>
                  <p className="text-3xl font-bold text-red-800">{currentState?.breachedSlas ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Team Rankings */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Team Rankings</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Rank</th>
                      <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Team</th>
                      <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600">Score</th>
                      <th className="text-right py-2 px-4 text-sm font-semibold text-gray-600">Overall Rating</th>
                      <th className="text-center py-2 px-4 text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamComparison.map((tc, index) => (
                      <tr key={tc.team.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className={`font-bold ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-400' :
                            'text-gray-600'
                          }`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">{tc.team.name}</td>
                        <td className="py-3 px-4 text-right font-semibold text-hawk-purple">{tc.team.score}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-1 rounded text-sm ${
                            tc.metrics.overallScore >= 80 ? 'bg-green-100 text-green-700' :
                            tc.metrics.overallScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {tc.metrics.overallScore}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedTeam(selectedTeam === tc.team.id ? null : tc.team.id)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {selectedTeam === tc.team.id ? 'Hide Details' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Team Details */}
            {selectedTeam && (
              <div className="bg-gray-50 rounded-lg p-4">
                {(() => {
                  const team = teamComparison.find(tc => tc.team.id === selectedTeam);
                  if (!team) return null;

                  return (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">{team.team.name} - Detailed Metrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {team.metrics.metrics.map(metric => (
                          <div
                            key={metric.name}
                            className={`p-3 rounded-lg ${getPerformanceColor(metric.performance)}`}
                          >
                            <p className="text-xs font-medium mb-1">{metric.displayName}</p>
                            <p className="text-xl font-bold">{metric.value.toFixed(1)} {metric.unit}</p>
                            <p className="text-xs opacity-75">Benchmark: {metric.benchmark}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics Comparison</h3>
            {teamComparison.map(tc => (
              <div key={tc.team.id} className="mb-6 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-800">{tc.team.name}</h4>
                  <span className="text-hawk-purple font-bold">{tc.metrics.overallScore}% Overall</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {tc.metrics.metrics.map(metric => (
                    <div
                      key={metric.name}
                      className={`p-3 rounded border ${
                        metric.performance === 'above' ? 'border-green-200 bg-green-50' :
                        metric.performance === 'at' ? 'border-yellow-200 bg-yellow-50' :
                        'border-red-200 bg-red-50'
                      }`}
                    >
                      <p className="text-xs text-gray-600 mb-1">{metric.displayName}</p>
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-bold">{metric.value.toFixed(1)}</span>
                        <span className="text-xs text-gray-500">{metric.unit}</span>
                      </div>
                      <div className="mt-1 h-1 bg-gray-200 rounded overflow-hidden">
                        <div
                          className={`h-full ${
                            metric.performance === 'above' ? 'bg-green-500' :
                            metric.performance === 'at' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (metric.value / metric.benchmark) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Learning Tab */}
        {activeTab === 'learning' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Learning Progress</h3>
            {teamComparison.map(tc => (
              <div key={tc.team.id} className="mb-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">{tc.team.name}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {tc.learningProgress.map(lp => (
                    <div key={lp.skillArea} className="bg-white p-3 rounded border">
                      <p className="text-xs text-gray-600 mb-2">{formatSkillArea(lp.skillArea)}</p>
                      <div className="flex items-center justify-between mb-1">
                        <div>{getProficiencyStars(lp.proficiencyLevel)}</div>
                        <span className={`text-xs ${
                          lp.trend === 'improving' ? 'text-green-600' :
                          lp.trend === 'declining' ? 'text-red-600' :
                          'text-gray-400'
                        }`}>
                          {lp.trend === 'improving' ? '↑' : lp.trend === 'declining' ? '↓' : '–'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{lp.demonstratedCount} demonstrations</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && dashboardData?.snapshotHistory && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Historical Trends</h3>

            {/* Snapshot History Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Time</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Round</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Total Score</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Health</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Incidents</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Resolved</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Breached</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Avg Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.snapshotHistory.map((snapshot: Snapshot, index: number) => (
                    <tr key={snapshot.id} className={`border-b ${index === 0 ? 'bg-purple-50' : ''}`}>
                      <td className="py-2 px-3 text-gray-600">
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right">{snapshot.roundNumber}</td>
                      <td className="py-2 px-3 text-right font-semibold text-hawk-purple">{snapshot.totalScore}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={`${
                          snapshot.systemHealthScore >= 90 ? 'text-green-600' :
                          snapshot.systemHealthScore >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {snapshot.systemHealthScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">{snapshot.totalIncidents}</td>
                      <td className="py-2 px-3 text-right text-green-600">{snapshot.resolvedIncidents}</td>
                      <td className="py-2 px-3 text-right text-red-600">{snapshot.breachedSlas}</td>
                      <td className="py-2 px-3 text-right">
                        {snapshot.avgResolutionTimeMinutes
                          ? `${snapshot.avgResolutionTimeMinutes.toFixed(1)}m`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual Trend Indicators */}
            {trends && (
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">Score Trend</p>
                  <div className="text-4xl">{getTrendIcon(trends.scoreTrend)}</div>
                  <p className="text-sm text-gray-500 mt-1 capitalize">{trends.scoreTrend}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">System Health Trend</p>
                  <div className="text-4xl">{getTrendIcon(trends.systemHealthTrend)}</div>
                  <p className="text-sm text-gray-500 mt-1 capitalize">{trends.systemHealthTrend}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">Resolution Trend</p>
                  <div className="text-4xl">{getTrendIcon(trends.incidentResolutionTrend)}</div>
                  <p className="text-sm text-gray-500 mt-1 capitalize">{trends.incidentResolutionTrend}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
