import { useState, useEffect, useCallback } from 'react';
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
  workflowState: string;
  requestedByTeamId: string;
  requestedByTeamName?: string;
  reviewTeamId?: string;
  reviewTeamName?: string;
  reviewStatus?: string;
  reviewNotes?: string;
  approvalNotes?: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  role: string;
}

interface CABWorkflowPanelProps {
  gameId: string;
  teamId: string;
  teams: Team[];
  isCABTeam: boolean;
  compact?: boolean;
}

const WORKFLOW_STATE_LABELS: Record<string, string> = {
  pending_cab: 'Pending CAB Review',
  under_review: 'Under Technical Review',
  review_complete: 'Review Complete',
  approved: 'Approved',
  rejected: 'Rejected',
};

const WORKFLOW_STATE_COLORS: Record<string, string> = {
  pending_cab: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  review_complete: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function CABWorkflowPanel({
  gameId,
  teamId,
  teams,
  isCABTeam,
  compact = false,
}: CABWorkflowPanelProps) {
  const [pendingChanges, setPendingChanges] = useState<ChangeRequest[]>([]);
  const [reviewChanges, setReviewChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<ChangeRequest | null>(null);
  const [showSendForReview, setShowSendForReview] = useState(false);
  const [selectedReviewTeam, setSelectedReviewTeam] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchChanges = useCallback(async () => {
    try {
      if (isCABTeam) {
        // CAB team sees pending changes
        const response = await axios.get(`${API_URL}/games/${gameId}/changes/cab-pending`);
        setPendingChanges(response.data || []);
      }

      // All teams can see changes assigned to them for review
      const reviewResponse = await axios.get(
        `${API_URL}/games/${gameId}/teams/${teamId}/changes/review`
      );
      setReviewChanges(reviewResponse.data || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching CAB changes:', error);
      setLoading(false);
    }
  }, [gameId, teamId, isCABTeam]);

  useEffect(() => {
    fetchChanges();
    const interval = setInterval(fetchChanges, 15000);
    return () => clearInterval(interval);
  }, [fetchChanges]);

  const handleSendForReview = async (changeId: string) => {
    if (!selectedReviewTeam) {
      toast.error('Please select a team to review');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/changes/${changeId}/send-for-review`, {
        reviewTeamId: selectedReviewTeam,
        cabNotes: reviewNotes,
      });
      toast.success('Change sent for technical review');
      setShowSendForReview(false);
      setSelectedChange(null);
      setSelectedReviewTeam('');
      setReviewNotes('');
      fetchChanges();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send for review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (changeId: string, status: string, notes: string) => {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/changes/${changeId}/submit-review`, {
        reviewStatus: status,
        reviewNotes: notes,
      });
      toast.success('Review submitted');
      setSelectedChange(null);
      fetchChanges();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCABDecision = async (changeId: string, decision: 'approve' | 'reject', notes?: string) => {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/changes/${changeId}/cab-${decision}`, {
        notes,
      });
      toast.success(`Change ${decision}d`);
      setSelectedChange(null);
      fetchChanges();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${decision} change`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const totalPending = pendingChanges.length + reviewChanges.length;

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            {isCABTeam ? 'CAB Queue' : 'Review Requests'}
          </h3>
          {totalPending > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold">
              {totalPending} pending
            </span>
          )}
        </div>

        {totalPending === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">No pending items</p>
        ) : (
          <div className="space-y-2">
            {[...pendingChanges, ...reviewChanges].slice(0, 3).map((change) => (
              <div
                key={change.id}
                className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                onClick={() => setSelectedChange(change)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm">{change.changeNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${WORKFLOW_STATE_COLORS[change.workflowState]}`}>
                    {change.workflowState === 'pending_cab' ? 'Pending' :
                     change.workflowState === 'under_review' ? 'Review' :
                     'Ready'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate">{change.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">
          {isCABTeam ? 'Change Advisory Board' : 'Change Review Queue'}
        </h2>
        <p className="text-sm text-gray-500">
          {isCABTeam
            ? 'Review and approve change requests from teams'
            : 'Review change requests assigned to your team'}
        </p>
      </div>

      <div className="p-4">
        {/* CAB Team View - Pending Changes */}
        {isCABTeam && pendingChanges.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Pending CAB Review</h3>
            <div className="space-y-3">
              {pendingChanges.map((change) => (
                <div
                  key={change.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedChange(change)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{change.changeNumber}</span>
                        <span className={`text-xs px-2 py-1 rounded ${WORKFLOW_STATE_COLORS[change.workflowState]}`}>
                          {WORKFLOW_STATE_LABELS[change.workflowState]}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-800">{change.title}</h4>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      change.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                      change.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                      change.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {change.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{change.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Requested by: {change.requestedByTeamName || 'Unknown'}</span>
                    <span>Type: {change.changeType}</span>
                    {change.reviewStatus && (
                      <span className="text-purple-600">
                        Review: {change.reviewStatus.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Changes Assigned for Review (All teams) */}
        {reviewChanges.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Assigned for Your Review</h3>
            <div className="space-y-3">
              {reviewChanges.map((change) => (
                <div
                  key={change.id}
                  className="border border-blue-200 rounded-lg p-4 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                  onClick={() => setSelectedChange(change)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-mono font-semibold">{change.changeNumber}</span>
                      <h4 className="font-medium text-gray-800">{change.title}</h4>
                    </div>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                      Needs Your Review
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{change.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalPending === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🏛️</div>
            <p>No pending change requests</p>
          </div>
        )}
      </div>

      {/* Change Detail Modal */}
      {selectedChange && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedChange(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <span className="font-mono text-sm text-gray-500">{selectedChange.changeNumber}</span>
                <h3 className="font-bold text-gray-800">{selectedChange.title}</h3>
              </div>
              <button onClick={() => setSelectedChange(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-xs text-gray-500">Type</span>
                  <p className="font-medium">{selectedChange.changeType}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Risk Level</span>
                  <p className={`font-medium ${
                    selectedChange.riskLevel === 'critical' ? 'text-red-600' :
                    selectedChange.riskLevel === 'high' ? 'text-orange-600' :
                    selectedChange.riskLevel === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {selectedChange.riskLevel.toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Requested By</span>
                  <p className="font-medium">{selectedChange.requestedByTeamName || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Status</span>
                  <p className={`font-medium px-2 py-0.5 rounded inline-block text-sm ${WORKFLOW_STATE_COLORS[selectedChange.workflowState]}`}>
                    {WORKFLOW_STATE_LABELS[selectedChange.workflowState]}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-xs text-gray-500">Description</span>
                <p className="text-gray-700 mt-1">{selectedChange.description}</p>
              </div>

              {selectedChange.reviewNotes && (
                <div className="mb-4 p-3 bg-purple-50 rounded">
                  <span className="text-xs font-semibold text-purple-700">Technical Review Notes</span>
                  <p className="text-sm text-purple-600 mt-1">{selectedChange.reviewNotes}</p>
                  {selectedChange.reviewStatus && (
                    <p className="text-xs text-purple-500 mt-2">
                      Recommendation: {selectedChange.reviewStatus.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              )}

              {selectedChange.approvalNotes && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <span className="text-xs font-semibold text-gray-700">Notes</span>
                  <p className="text-sm text-gray-600 mt-1">{selectedChange.approvalNotes}</p>
                </div>
              )}

              {/* CAB Actions */}
              {isCABTeam && selectedChange.workflowState === 'pending_cab' && !showSendForReview && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowSendForReview(true)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Send for Technical Review
                  </button>
                  <button
                    onClick={() => handleCABDecision(selectedChange.id, 'approve')}
                    disabled={submitting}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleCABDecision(selectedChange.id, 'reject')}
                    disabled={submitting}
                    className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}

              {/* Send for Review Form */}
              {isCABTeam && showSendForReview && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-3">Send for Technical Review</h4>
                  <div className="mb-3">
                    <label className="block text-sm text-gray-700 mb-1">Select Review Team</label>
                    <select
                      value={selectedReviewTeam}
                      onChange={(e) => setSelectedReviewTeam(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select a team...</option>
                      {teams
                        .filter((t) => t.role !== 'Management/CAB')
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} - {t.role}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm text-gray-700 mb-1">Notes for Review Team</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full p-2 border rounded"
                      rows={3}
                      placeholder="Any specific areas to focus on..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSendForReview(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSendForReview(selectedChange.id)}
                      disabled={submitting || !selectedReviewTeam}
                      className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Sending...' : 'Send for Review'}
                    </button>
                  </div>
                </div>
              )}

              {/* CAB Actions for Review Complete */}
              {isCABTeam && selectedChange.workflowState === 'review_complete' && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => handleCABDecision(selectedChange.id, 'approve')}
                    disabled={submitting}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve Change
                  </button>
                  <button
                    onClick={() => handleCABDecision(selectedChange.id, 'reject')}
                    disabled={submitting}
                    className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject Change
                  </button>
                </div>
              )}

              {/* Review Team Actions */}
              {!isCABTeam && selectedChange.workflowState === 'under_review' && (
                <ReviewForm
                  onSubmit={(status, notes) => handleSubmitReview(selectedChange.id, status, notes)}
                  submitting={submitting}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Review submission form component
function ReviewForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (status: string, notes: string) => void;
  submitting: boolean;
}) {
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState('');

  return (
    <div className="mt-4 pt-4 border-t">
      <h4 className="font-semibold mb-3">Submit Your Review</h4>
      <div className="mb-3">
        <label className="block text-sm text-gray-700 mb-1">Your Recommendation</label>
        <select
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select recommendation...</option>
          <option value="recommend_approve">Recommend Approval</option>
          <option value="recommend_reject">Recommend Rejection</option>
          <option value="needs_rework">Needs Rework</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="block text-sm text-gray-700 mb-1">Review Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border rounded"
          rows={4}
          placeholder="Technical assessment, concerns, recommendations..."
          required
        />
      </div>
      <button
        onClick={() => onSubmit(recommendation, notes)}
        disabled={submitting || !recommendation || !notes.trim()}
        className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}
