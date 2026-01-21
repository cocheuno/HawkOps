import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface TeamRanking {
  rank: number;
  teamId: string;
  teamName: string;
  teamRole: string;
  score: number;
  metrics: {
    incidentsResolved: number;
    avgResolutionTime: number;
    slaCompliance: number;
    stakeholderSatisfaction: number;
    pirScore: number;
    achievementCount: number;
    achievementPoints: number;
  };
  trend: 'up' | 'down' | 'stable';
  previousRank: number | null;
}

interface LeaderboardData {
  gameId: string;
  gameName: string;
  currentRound: number;
  rankings: TeamRanking[];
  lastUpdated: string;
}

interface ActivityItem {
  type: 'achievement' | 'resolution';
  timestamp: string;
  teamName: string;
  title: string;
  icon: string;
  points: number;
  rarity: string;
}

interface LeaderboardProps {
  gameId: string;
  currentTeamId?: string;
  compact?: boolean;
  showActivity?: boolean;
}

export default function Leaderboard({ gameId, currentTeamId, compact = false, showActivity = true }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    if (showActivity) {
      fetchActivity();
    }
    // Poll for updates
    const interval = setInterval(() => {
      fetchLeaderboard();
      if (showActivity) fetchActivity();
    }, 10000);
    return () => clearInterval(interval);
  }, [gameId, showActivity]);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/games/${gameId}/leaderboard`);
      setLeaderboard(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const response = await axios.get(`${API_URL}/games/${gameId}/leaderboard/activity?limit=10`);
      setActivity(response.data);
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <span className="text-green-500">▲</span>;
      case 'down': return <span className="text-red-500">▼</span>;
      default: return <span className="text-gray-400">●</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
      case 3: return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank.toString();
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-500';
      case 'epic': return 'text-purple-500';
      case 'rare': return 'text-blue-500';
      case 'uncommon': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-500 text-center">Unable to load leaderboard</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${compact ? '' : 'p-4'}`}>
      {/* Header */}
      <div className={`flex justify-between items-center ${compact ? 'p-4 border-b' : 'mb-4'}`}>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Live Leaderboard</h2>
          <p className="text-sm text-gray-500">Round {leaderboard.currentRound}</p>
        </div>
        <div className="text-xs text-gray-400">
          Updated {new Date(leaderboard.lastUpdated).toLocaleTimeString()}
        </div>
      </div>

      {/* Rankings */}
      <div className={compact ? 'p-4' : ''}>
        <div className="space-y-2">
          {leaderboard.rankings.map((team) => (
            <div key={team.teamId}>
              <div
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                  team.teamId === currentTeamId
                    ? 'bg-purple-50 border-2 border-hawk-purple'
                    : 'hover:bg-gray-50 border border-gray-100'
                }`}
                onClick={() => setShowDetails(showDetails === team.teamId ? null : team.teamId)}
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mr-3 ${getRankStyle(team.rank)}`}>
                  {getRankIcon(team.rank)}
                </div>

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 truncate">{team.teamName}</span>
                    {team.teamId === currentTeamId && (
                      <span className="text-xs bg-hawk-purple text-white px-2 py-0.5 rounded">You</span>
                    )}
                    {getTrendIcon(team.trend)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{team.teamRole}</p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-xl font-bold text-hawk-purple">{team.score.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">points</div>
                </div>

                {/* Expand icon */}
                <div className="ml-2 text-gray-400">
                  {showDetails === team.teamId ? '▼' : '▶'}
                </div>
              </div>

              {/* Expanded Metrics */}
              {showDetails === team.teamId && (
                <div className="bg-gray-50 rounded-b-lg p-4 mt-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{team.metrics.incidentsResolved}</div>
                    <div className="text-xs text-gray-500">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{team.metrics.slaCompliance}%</div>
                    <div className="text-xs text-gray-500">SLA Compliance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{team.metrics.avgResolutionTime}m</div>
                    <div className="text-xs text-gray-500">Avg Resolution</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{team.metrics.achievementCount}</div>
                    <div className="text-xs text-gray-500">Achievements</div>
                  </div>
                  {!compact && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{team.metrics.stakeholderSatisfaction}%</div>
                        <div className="text-xs text-gray-500">Stakeholder Sat.</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-pink-600">{team.metrics.pirScore}</div>
                        <div className="text-xs text-gray-500">PIR Score</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      {showActivity && activity.length > 0 && !compact && (
        <div className="border-t mt-4 pt-4">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activity.map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">{item.teamName}</span>
                  <span className="text-gray-500 mx-1">
                    {item.type === 'achievement' ? 'earned' : 'resolved'}
                  </span>
                  <span className={`font-medium ${item.type === 'achievement' ? getRarityColor(item.rarity) : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                </div>
                <span className="text-hawk-purple font-semibold">+{item.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
