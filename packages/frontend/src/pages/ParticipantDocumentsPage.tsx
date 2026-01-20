import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import Navigation from '../components/Navigation';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Document {
  id: string;
  document_type: string;
  title: string;
  content?: string;
  visibility: string;
  is_required_reading: boolean;
  estimated_read_time?: number;
  tags: string[];
  created_at: string;
  is_read: boolean;
}

export default function ParticipantDocumentsPage() {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get('playerId');
  const teamId = searchParams.get('teamId');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  const fetchDocuments = async () => {
    if (!playerId && !teamId) {
      toast.error('Player ID or Team ID is required');
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (playerId) params.set('playerId', playerId);
      if (teamId) params.set('teamId', teamId);

      const response = await axios.get(`${API_URL}/games/${gameId}/documents?${params.toString()}`);
      setDocuments(response.data.documents);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
      setLoading(false);
    }
  };

  const fetchDocumentContent = async (documentId: string) => {
    try {
      const params = new URLSearchParams();
      if (playerId) params.set('playerId', playerId);
      if (teamId) params.set('teamId', teamId);

      const response = await axios.get(
        `${API_URL}/games/${gameId}/documents/${documentId}?${params.toString()}`
      );
      setSelectedDoc(response.data.document);
    } catch (error: any) {
      console.error('Error fetching document:', error);
      toast.error('Failed to fetch document content');
    }
  };

  const markAsRead = async (documentId: string) => {
    if (!playerId) return;

    setMarkingRead(true);
    try {
      await axios.post(`${API_URL}/games/${gameId}/documents/${documentId}/mark-read`, {
        playerId,
        ipAddress: window.location.hostname,
      });

      // Update local state
      setDocuments(
        documents.map((doc) =>
          doc.id === documentId ? { ...doc, is_read: true } : doc
        )
      );

      if (selectedDoc && selectedDoc.id === documentId) {
        setSelectedDoc({ ...selectedDoc, is_read: true });
      }

      toast.success('Marked as read');
    } catch (error: any) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    } finally {
      setMarkingRead(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [gameId, playerId]);

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      instructor_playbook: 'Instructor Playbook',
      general_briefing: 'General Briefing',
      team_packet: 'Team Packet',
      player_instructions: 'Player Instructions',
    };
    return labels[type] || type;
  };

  const getDocumentTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      instructor_playbook: 'bg-purple-100 text-purple-700',
      general_briefing: 'bg-blue-100 text-blue-700',
      team_packet: 'bg-green-100 text-green-700',
      player_instructions: 'bg-yellow-100 text-yellow-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const unreadCount = documents.filter((doc) => !doc.is_read).length;
  const requiredUnreadCount = documents.filter(
    (doc) => doc.is_required_reading && !doc.is_read
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading briefing documents...</div>
      </div>
    );
  }

  if (!playerId && !teamId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Player ID or Team ID is required in URL parameters</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation
        title="Briefing Documents"
        homeUrl={`/instructor/${gameId}`}
        backPath={teamId ? `/team/${teamId}` : `/instructor/${gameId}`}
      />
      <div className="max-w-5xl mx-auto px-6 pb-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Briefing Documents</h1>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold">{documents.length}</span>
            </span>
            {unreadCount > 0 && (
              <span className="text-orange-600">
                Unread: <span className="font-semibold">{unreadCount}</span>
              </span>
            )}
            {requiredUnreadCount > 0 && (
              <span className="text-red-600">
                Required Unread: <span className="font-semibold">{requiredUnreadCount}</span>
              </span>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Available Documents</h2>
          </div>
          <div className="p-4">
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No briefing documents available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Documents will appear here when the instructor publishes them
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      doc.is_read ? 'border-gray-200' : 'border-blue-300 bg-blue-50'
                    }`}
                    onClick={() => fetchDocumentContent(doc.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {!doc.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded font-semibold ${getDocumentTypeBadgeColor(
                            doc.document_type
                          )}`}
                        >
                          {getDocumentTypeLabel(doc.document_type)}
                        </span>
                        <h4 className="font-semibold text-gray-800">{doc.title}</h4>
                      </div>
                      <div className="flex gap-2 items-center">
                        {doc.is_required_reading && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                            Required
                          </span>
                        )}
                        {doc.is_read && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                            ✓ Read
                          </span>
                        )}
                      </div>
                    </div>

                    {doc.estimated_read_time && (
                      <p className="text-sm text-gray-600">
                        Estimated reading time: {doc.estimated_read_time} minutes
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
          >
            {/* Header */}
            <div
              className="bg-hawk-purple text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10"
              style={{ backgroundColor: '#4B2E83', color: '#ffffff' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs px-2 py-1 rounded font-semibold ${getDocumentTypeBadgeColor(
                      selectedDoc.document_type
                    )}`}
                  >
                    {getDocumentTypeLabel(selectedDoc.document_type)}
                  </span>
                  {selectedDoc.is_required_reading && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                      Required
                    </span>
                  )}
                  {selectedDoc.is_read && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                      ✓ Read
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                  {selectedDoc.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-white hover:text-gray-200"
                style={{ color: '#ffffff' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6" style={{ color: '#1f2937' }}>
              <div className="prose prose-lg max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                <ReactMarkdown>{selectedDoc.content || ''}</ReactMarkdown>
              </div>

              {/* Mark as Read Button */}
              {!selectedDoc.is_read && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => markAsRead(selectedDoc.id)}
                    disabled={markingRead}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {markingRead ? 'Marking as read...' : 'Mark as Read'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
