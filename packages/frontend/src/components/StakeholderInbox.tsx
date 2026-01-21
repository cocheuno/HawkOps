import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface StakeholderMessage {
  id: string;
  stakeholderType: string;
  stakeholderName: string;
  stakeholderTitle: string;
  message: string;
  urgency: string;
  sentiment: string;
  responseDeadline: string | null;
  responseText: string | null;
  respondedAt: string | null;
  aiResponseScore: number | null;
  aiResponseFeedback: any | null;
  status: string;
  createdAt: string;
}

interface StakeholderInboxProps {
  teamId: string;
  compact?: boolean;
}

const STAKEHOLDER_ICONS: Record<string, string> = {
  executive: '👔',
  customer: '🏢',
  media: '📰',
  regulator: '⚖️',
  vendor: '🤝',
};

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  normal: 'bg-blue-100 text-blue-700 border-blue-300',
  low: 'bg-gray-100 text-gray-700 border-gray-300',
};

const SENTIMENT_ICONS: Record<string, string> = {
  angry: '😠',
  concerned: '😟',
  neutral: '😐',
  supportive: '😊',
};

export default function StakeholderInbox({ teamId, compact = false }: StakeholderInboxProps) {
  const [communications, setCommunications] = useState<StakeholderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComm, setSelectedComm] = useState<StakeholderMessage | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCommunications();
    const interval = setInterval(fetchCommunications, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [teamId]);

  const fetchCommunications = async () => {
    try {
      const response = await axios.get(`${API_URL}/teams/${teamId}/communications`);
      setCommunications(response.data.communications);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching communications:', error);
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedComm || !responseText.trim()) {
      toast.error('Please write a response');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/communications/${selectedComm.id}/respond`, {
        responseText,
      });
      toast.success('Response submitted');
      setSelectedComm(null);
      setResponseText('');
      fetchCommunications();
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast.error(error.response?.data?.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs < 0) return 'Overdue';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  };

  const pendingCount = communications.filter(c => c.status === 'pending').length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-500 text-center">Loading communications...</p>
      </div>
    );
  }

  // Compact view - just show badge
  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-600">Stakeholder Messages</h3>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-hawk-purple mt-1">{communications.length}</p>
        <p className="text-xs text-gray-500 mt-1">
          {pendingCount > 0 ? `${pendingCount} need response` : 'All responded'}
        </p>
      </div>
    );
  }

  // Full view
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Stakeholder Communications</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-red-600">{pendingCount} awaiting response</p>
          )}
        </div>
      </div>

      <div className="p-4">
        {communications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No stakeholder communications yet</p>
        ) : (
          <div className="space-y-3">
            {communications.map((comm) => {
              const timeRemaining = getTimeRemaining(comm.responseDeadline);
              const isOverdue = timeRemaining === 'Overdue';
              const isPending = comm.status === 'pending';

              return (
                <div
                  key={comm.id}
                  onClick={() => setSelectedComm(comm)}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isPending ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' :
                    comm.status === 'responded' ? 'border-blue-200 hover:bg-blue-50' :
                    'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{STAKEHOLDER_ICONS[comm.stakeholderType] || '💼'}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{comm.stakeholderName}</h4>
                        <p className="text-xs text-gray-500">{comm.stakeholderTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded border font-semibold ${URGENCY_COLORS[comm.urgency]}`}>
                        {comm.urgency.toUpperCase()}
                      </span>
                      <span className="text-lg">{SENTIMENT_ICONS[comm.sentiment] || '😐'}</span>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm mb-2 line-clamp-2">{comm.message}</p>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">
                      {new Date(comm.createdAt).toLocaleString()}
                    </span>
                    {isPending && timeRemaining && (
                      <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                        {isOverdue ? '⚠️ Overdue' : `⏰ ${timeRemaining} left`}
                      </span>
                    )}
                    {comm.status === 'closed' && comm.aiResponseScore !== null && (
                      <span className={`font-semibold ${
                        comm.aiResponseScore >= 80 ? 'text-green-600' :
                        comm.aiResponseScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        Score: {comm.aiResponseScore}/100
                      </span>
                    )}
                    {comm.status === 'responded' && !comm.aiResponseScore && (
                      <span className="text-blue-600">Grading...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Communication Detail Modal */}
      {selectedComm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedComm(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-hawk-purple text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{STAKEHOLDER_ICONS[selectedComm.stakeholderType] || '💼'}</span>
                  <div>
                    <h3 className="text-xl font-bold">{selectedComm.stakeholderName}</h3>
                    <p className="text-purple-200">{selectedComm.stakeholderTitle}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedComm(null)} className="text-white text-2xl hover:opacity-75">
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <span className={`text-xs px-2 py-1 rounded font-semibold bg-white ${
                  selectedComm.urgency === 'critical' ? 'text-red-600' :
                  selectedComm.urgency === 'high' ? 'text-orange-600' :
                  'text-blue-600'
                }`}>
                  {selectedComm.urgency.toUpperCase()} URGENCY
                </span>
                <span className="text-lg">{SENTIMENT_ICONS[selectedComm.sentiment]}</span>
                <span className="text-purple-200 capitalize">{selectedComm.sentiment}</span>
              </div>
            </div>

            {/* Message */}
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-gray-800 whitespace-pre-wrap">{selectedComm.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Received: {new Date(selectedComm.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Response section */}
              {selectedComm.status === 'pending' ? (
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">
                    Your Response
                    {selectedComm.responseDeadline && (
                      <span className={`ml-2 text-sm font-normal ${
                        getTimeRemaining(selectedComm.responseDeadline) === 'Overdue' ? 'text-red-600' : 'text-orange-600'
                      }`}>
                        ({getTimeRemaining(selectedComm.responseDeadline)} remaining)
                      </span>
                    )}
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-hawk-purple"
                    rows={5}
                    placeholder="Write a professional response to the stakeholder..."
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Tips: Be professional, acknowledge their concerns, provide relevant information, and include clear next steps.
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Your Response</h4>
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedComm.responseText}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Responded: {selectedComm.respondedAt && new Date(selectedComm.respondedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* AI Feedback */}
                  {selectedComm.aiResponseScore !== null && selectedComm.aiResponseFeedback && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-green-800">AI Feedback</h4>
                        <span className={`text-2xl font-bold ${
                          selectedComm.aiResponseScore >= 80 ? 'text-green-600' :
                          selectedComm.aiResponseScore >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {selectedComm.aiResponseScore}/100
                        </span>
                      </div>
                      <p className="text-green-700 mb-3">{selectedComm.aiResponseFeedback.overall}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-semibold text-green-800">Professionalism:</span>
                          <span className="ml-1">{selectedComm.aiResponseFeedback.professionalism?.score}/25</span>
                        </div>
                        <div>
                          <span className="font-semibold text-green-800">Empathy:</span>
                          <span className="ml-1">{selectedComm.aiResponseFeedback.empathy?.score}/25</span>
                        </div>
                        <div>
                          <span className="font-semibold text-green-800">Information:</span>
                          <span className="ml-1">{selectedComm.aiResponseFeedback.information?.score}/25</span>
                        </div>
                        <div>
                          <span className="font-semibold text-green-800">Action-Oriented:</span>
                          <span className="ml-1">{selectedComm.aiResponseFeedback.actionOriented?.score}/25</span>
                        </div>
                      </div>
                      {selectedComm.aiResponseFeedback.exampleResponse && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <h5 className="font-semibold text-green-800 text-sm">Example of an ideal response:</h5>
                          <p className="text-green-700 text-sm mt-1 italic">
                            "{selectedComm.aiResponseFeedback.exampleResponse}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 p-4 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setSelectedComm(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
              {selectedComm.status === 'pending' && (
                <button
                  onClick={handleSubmitResponse}
                  disabled={submitting || !responseText.trim()}
                  className="px-6 py-2 bg-hawk-purple text-white rounded-lg hover:bg-purple-800 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Response'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
