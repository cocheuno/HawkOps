import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  points: number;
  rarity: string;
  earned: boolean;
  earnedAt?: string;
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
}

interface AchievementsPanelProps {
  teamId: string;
  gameId: string;
  compact?: boolean;
}

export default function AchievementsPanel({ teamId, gameId, compact = false }: AchievementsPanelProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, [teamId, gameId]);

  const fetchAchievements = async () => {
    try {
      const response = await axios.get(`${API_URL}/teams/${teamId}/achievements/progress?gameId=${gameId}`);
      setAchievements(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-amber-500 border-yellow-400';
      case 'epic': return 'from-purple-500 to-purple-700 border-purple-500';
      case 'rare': return 'from-blue-400 to-blue-600 border-blue-400';
      case 'uncommon': return 'from-green-400 to-green-600 border-green-400';
      default: return 'from-gray-300 to-gray-400 border-gray-300';
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'uncommon': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'speed': return '⚡';
      case 'quality': return '✨';
      case 'teamwork': return '🤝';
      case 'leadership': return '🎖️';
      case 'learning': return '📚';
      case 'special': return '🏆';
      default: return '🎯';
    }
  };

  const categories = ['all', ...new Set(achievements.map(a => a.category))];

  const filteredAchievements = achievements.filter(a => {
    if (filter !== 'all' && a.category !== filter) return false;
    if (showEarnedOnly && !a.earned) return false;
    return true;
  });

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalPoints = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.points, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    // Compact view - just show earned badges
    const earnedAchievements = achievements.filter(a => a.earned).slice(0, 5);

    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Achievements</h3>
          <span className="text-sm text-gray-500">{earnedCount}/{achievements.length}</span>
        </div>
        {earnedAchievements.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No achievements earned yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {earnedAchievements.map(achievement => (
              <div
                key={achievement.id}
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRarityColor(achievement.rarity)} flex items-center justify-center text-2xl cursor-pointer transition-transform hover:scale-110`}
                title={`${achievement.name}: ${achievement.description}`}
              >
                {achievement.icon}
              </div>
            ))}
            {earnedCount > 5 && (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                +{earnedCount - 5}
              </div>
            )}
          </div>
        )}
        <div className="mt-3 text-center text-sm text-hawk-purple font-semibold">
          {totalPoints.toLocaleString()} Achievement Points
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Achievements</h2>
            <p className="text-sm text-gray-500">
              {earnedCount} of {achievements.length} unlocked • {totalPoints.toLocaleString()} points earned
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === cat
                    ? 'bg-hawk-purple text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All' : `${getCategoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
            <input
              type="checkbox"
              checked={showEarnedOnly}
              onChange={(e) => setShowEarnedOnly(e.target.checked)}
              className="rounded"
            />
            Show earned only
          </label>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map(achievement => (
            <div
              key={achievement.id}
              className={`relative rounded-lg border-2 p-4 transition-all ${
                achievement.earned
                  ? `border-l-4 ${getRarityColor(achievement.rarity).split(' ').pop()} bg-gradient-to-r from-white to-gray-50`
                  : 'border-gray-200 bg-gray-50 opacity-75'
              }`}
            >
              {/* Badge icon */}
              <div className="flex items-start gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${
                  achievement.earned
                    ? `bg-gradient-to-br ${getRarityColor(achievement.rarity)} shadow-lg`
                    : 'bg-gray-200'
                }`}>
                  {achievement.earned ? achievement.icon : '🔒'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${achievement.earned ? 'text-gray-800' : 'text-gray-500'}`}>
                      {achievement.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRarityBadge(achievement.rarity)}`}>
                      {achievement.rarity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>

                  {/* Progress bar */}
                  {!achievement.earned && achievement.progress.target > 1 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{achievement.progress.current}/{achievement.progress.target}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-hawk-purple transition-all duration-500"
                          style={{ width: `${achievement.progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Earned date */}
                  {achievement.earned && achievement.earnedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Points badge */}
              <div className="absolute top-2 right-2">
                <span className={`text-sm font-bold ${achievement.earned ? 'text-hawk-purple' : 'text-gray-400'}`}>
                  +{achievement.points}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <p className="text-center text-gray-500 py-8">No achievements match your filters</p>
        )}
      </div>
    </div>
  );
}
