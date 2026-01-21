import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Challenge {
  id: string;
  gameId: string;
  title: string;
  description: string;
  challengeType: string;
  targetValue: number;
  currentValue: number;
  rewardPoints: number;
  status: string;
  startTime: string;
  endTime: string | null;
  assignedTeamId: string | null;
  completedByTeamId: string | null;
  progress: number;
}

interface ChallengesPanelProps {
  gameId: string;
  teamId?: string;
  compact?: boolean;
  isInstructor?: boolean;
}

export default function ChallengesPanel({ gameId, teamId, compact = false, isInstructor = false }: ChallengesPanelProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchChallenges();
    // Poll for updates
    const interval = setInterval(fetchChallenges, 15000);
    return () => clearInterval(interval);
  }, [gameId, teamId]);

  const fetchChallenges = async () => {
    try {
      const url = teamId
        ? `${API_URL}/games/${gameId}/challenges?teamId=${teamId}`
        : `${API_URL}/games/${gameId}/challenges/all`;
      const response = await axios.get(url);
      setChallenges(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      setLoading(false);
    }
  };

  const createRandomChallenge = async () => {
    if (!isInstructor) return;
    setCreating(true);
    try {
      await axios.post(`${API_URL}/games/${gameId}/challenges/random`);
      await fetchChallenges();
    } catch (error) {
      console.error('Error creating challenge:', error);
    } finally {
      setCreating(false);
    }
  };

  const getTimeRemaining = (endTime: string | null) => {
    if (!endTime) return null;

    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const getChallengeTypeIcon = (type: string) => {
    switch (type) {
      case 'speed': return '⚡';
      case 'response_time': return '🏃';
      case 'sla_streak': return '🎯';
      case 'pir_quality': return '📝';
      case 'pir_excellence': return '🏆';
      case 'stakeholder_satisfaction': return '💬';
      case 'high_stakes_comm': return '🎤';
      case 'cost_efficiency': return '💰';
      case 'clear_queue': return '✅';
      case 'collaboration': return '🤝';
      default: return '🎪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Active Challenges</h3>
          <span className="text-sm text-gray-500">{activeChallenges.length} active</span>
        </div>

        {activeChallenges.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No active challenges</p>
        ) : (
          <div className="space-y-3">
            {activeChallenges.slice(0, 3).map(challenge => (
              <div key={challenge.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getChallengeTypeIcon(challenge.challengeType)}</span>
                  <span className="font-medium text-gray-800 flex-1 truncate">{challenge.title}</span>
                  <span className="text-hawk-purple font-semibold text-sm">+{challenge.rewardPoints}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getProgressColor(challenge.progress)}`}
                    style={{ width: `${challenge.progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{challenge.progress}% complete</span>
                  <span>{getTimeRemaining(challenge.endTime)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Team Challenges</h2>
          <p className="text-sm text-gray-500">
            {activeChallenges.length} active • {completedChallenges.length} completed
          </p>
        </div>
        {isInstructor && (
          <button
            onClick={createRandomChallenge}
            disabled={creating}
            className="bg-hawk-purple text-white px-4 py-2 rounded-lg hover:bg-purple-800 disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <span className="animate-spin">⏳</span>
                Creating...
              </>
            ) : (
              <>
                🎲 New Random Challenge
              </>
            )}
          </button>
        )}
      </div>

      {/* Challenges List */}
      <div className="p-4">
        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Active Challenges
            </h3>
            <div className="space-y-4">
              {activeChallenges.map(challenge => (
                <div
                  key={challenge.id}
                  className="border-2 border-green-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-white"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{getChallengeTypeIcon(challenge.challengeType)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-800">{challenge.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(challenge.status)}`}>
                          {challenge.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>

                      {/* Progress */}
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold text-gray-800">
                            {challenge.currentValue}/{challenge.targetValue}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${getProgressColor(challenge.progress)}`}
                            style={{ width: `${challenge.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Time and Reward */}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-orange-600 font-medium">
                          ⏱️ {getTimeRemaining(challenge.endTime)}
                        </span>
                        <span className="text-hawk-purple font-bold">
                          🏆 +{challenge.rewardPoints} points
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Completed Challenges</h3>
            <div className="space-y-2">
              {completedChallenges.map(challenge => (
                <div
                  key={challenge.id}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center gap-3"
                >
                  <span className="text-2xl">{getChallengeTypeIcon(challenge.challengeType)}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-700">{challenge.title}</h4>
                    <p className="text-xs text-gray-500">{challenge.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-green-600 font-bold">✓ +{challenge.rewardPoints}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {challenges.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-gray-500">No challenges available yet</p>
            {isInstructor && (
              <p className="text-sm text-gray-400 mt-1">Create a challenge to motivate teams!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
