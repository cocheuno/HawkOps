import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Document {
  id: string;
  document_type: string;
  title: string;
  content: string;
  visibility: string;
  team_id?: string;
  team_name?: string;
  player_id?: string;
  player_name?: string;
  status: string;
  is_required_reading: boolean;
  estimated_read_time?: number;
  read_count?: number;
  created_at: string;
}

export default function DocumentManagerPage() {
  const { gameId } = useParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/instructor/games/${gameId}/documents`);
      setDocuments(response.data.documents);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [gameId]);

  const handlePublish = async (docId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await axios.patch(`${API_URL}/instructor/games/${gameId}/documents/${docId}/publish`, {
        status: newStatus,
      });
      toast.success(`Document ${newStatus === 'published' ? 'published' : 'unpublished'}`);
      fetchDocuments();
    } catch (error: any) {
      console.error('Error publishing document:', error);
      toast.error('Failed to update document status');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await axios.delete(`${API_URL}/instructor/games/${gameId}/documents/${docId}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

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

  const getVisibilityLabel = (visibility: string, doc: Document) => {
    if (visibility === 'instructor_only') return 'Instructor Only';
    if (visibility === 'all_participants') return 'All Participants';
    if (visibility === 'team_only') return `Team: ${doc.team_name || 'Unknown'}`;
    if (visibility === 'player_only') return `Player: ${doc.player_name || 'Unknown'}`;
    return visibility;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Briefing Documents</h1>
              <p className="text-gray-600">
                Manage simulation briefing materials, team packets, and player instructions
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-hawk-purple hover:bg-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              + Create Document
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">All Documents ({documents.length})</h2>
          </div>
          <div className="p-4">
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No documents created yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Create your first document to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span
                          className={`text-xs px-2 py-1 rounded font-semibold ${getDocumentTypeBadgeColor(
                            doc.document_type
                          )}`}
                        >
                          {getDocumentTypeLabel(doc.document_type)}
                        </span>
                        <h4 className="font-semibold text-gray-800">{doc.title}</h4>
                        {doc.is_required_reading && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span
                          className={`text-xs px-2 py-1 rounded font-semibold ${
                            doc.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                      <span>Visibility: {getVisibilityLabel(doc.visibility, doc)}</span>
                      {doc.estimated_read_time && (
                        <span>Est. read time: {doc.estimated_read_time} min</span>
                      )}
                      {typeof doc.read_count !== 'undefined' && (
                        <span>Read by: {doc.read_count} participants</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                      >
                        View/Edit
                      </button>
                      <button
                        onClick={() => handlePublish(doc.id, doc.status)}
                        className={`text-sm px-4 py-2 rounded transition-colors ${
                          doc.status === 'published'
                            ? 'bg-gray-500 hover:bg-gray-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {doc.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal - Placeholder for now */}
      {(showCreateModal || selectedDoc) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">
              {selectedDoc ? 'Edit Document' : 'Create Document'}
            </h2>
            <p className="text-gray-600 mb-4">
              Full document editor coming soon. For now, use the API directly or wait for the next
              update.
            </p>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedDoc(null);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
