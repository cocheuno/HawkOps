import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Template {
  id: string;
  name: string;
  description: string;
  document_type: string;
  content_template: string;
  placeholders: any[];
}

interface Team {
  id: string;
  name: string;
}

interface Player {
  id: string;
  name: string;
  team_id: string;
}

interface DocumentEditorProps {
  gameId: string;
  document?: any; // Existing document for editing
  onClose: () => void;
  onSave: () => void;
}

export default function DocumentEditor({ gameId, document, onClose, onSave }: DocumentEditorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players] = useState<Player[]>([]); // setPlayers unused - players endpoint not yet implemented

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [documentType, setDocumentType] = useState(document?.document_type || 'general_briefing');
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.content || '');
  const [visibility, setVisibility] = useState(document?.visibility || 'all_participants');
  const [teamId, setTeamId] = useState(document?.team_id || '');
  const [playerId, setPlayerId] = useState(document?.player_id || '');
  const [isRequiredReading, setIsRequiredReading] = useState(document?.is_required_reading || false);
  const [estimatedReadTime, setEstimatedReadTime] = useState(document?.estimated_read_time || '');
  const [status, setStatus] = useState(document?.status || 'draft');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchTeamsAndPlayers();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/instructor/templates`);
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchTeamsAndPlayers = async () => {
    try {
      // Fetch game state from instructor endpoint to get teams
      const gameStateResponse = await axios.get(`${API_URL}/instructor/games/${gameId}/state`);
      console.log('Game state response:', gameStateResponse.data);

      if (gameStateResponse.data.teams) {
        console.log('Teams loaded:', gameStateResponse.data.teams);
        setTeams(gameStateResponse.data.teams);
      } else {
        console.warn('No teams found in game state response');
      }

      // Players endpoint might not exist yet - skip for now
      // In future, add a proper players endpoint
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Could not load teams. You can still create documents with other visibility options.');
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setDocumentType(template.document_type);
    setContent(template.content_template);

    // Set default visibility based on document type
    if (template.document_type === 'instructor_playbook') {
      setVisibility('instructor_only');
    } else if (template.document_type === 'general_briefing') {
      setVisibility('all_participants');
    } else if (template.document_type === 'team_packet') {
      setVisibility('team_only');
    } else if (template.document_type === 'player_instructions') {
      setVisibility('player_only');
    }
  };

  const replacePlaceholders = () => {
    let processedContent = content;

    // Replace common placeholders
    processedContent = processedContent.replace(/\{\{game_name\}\}/g, 'HawkOps Simulation');
    processedContent = processedContent.replace(/\{\{scenario_type\}\}/g, 'ITSM');
    processedContent = processedContent.replace(/\{\{duration_minutes\}\}/g, '75');
    processedContent = processedContent.replace(/\{\{max_rounds\}\}/g, '4');

    // Replace team-specific placeholders
    if (teamId && teams.length > 0) {
      const team = teams.find(t => t.id === teamId);
      if (team) {
        processedContent = processedContent.replace(/\{\{team_name\}\}/g, team.name);
      }
    }

    setContent(processedContent);
    toast.success('Placeholders replaced');
  };

  const handleSave = async () => {
    if (!title || !content) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        documentType,
        title,
        content,
        visibility,
        teamId: visibility === 'team_only' ? teamId : null,
        playerId: visibility === 'player_only' ? playerId : null,
        isRequiredReading,
        estimatedReadTime: estimatedReadTime ? parseInt(estimatedReadTime) : null,
        status,
      };

      if (document) {
        // Update existing
        await axios.put(`${API_URL}/instructor/games/${gameId}/documents/${document.id}`, payload);
        toast.success('Document updated');
      } else {
        // Create new
        await axios.post(`${API_URL}/instructor/games/${gameId}/documents`, payload);
        toast.success('Document created');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving document:', error);
      toast.error(error.response?.data?.error || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="bg-hawk-purple text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ backgroundColor: '#4B2E83' }}>
          <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
            {document ? 'Edit Document' : 'Create Document'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
            style={{ color: '#ffffff' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Selection */}
          {!document && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start from Template (Optional)
              </label>
              <select
                onChange={(e) => {
                  const template = templates.find(t => t.id === e.target.value);
                  if (template) handleTemplateSelect(template);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              >
                <option value="">-- Select a template --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Document Type *
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
            >
              <option value="instructor_playbook">Instructor Playbook</option>
              <option value="general_briefing">General Briefing</option>
              <option value="team_packet">Team Packet</option>
              <option value="player_instructions">Player Instructions</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., General Briefing - ITSM Simulation"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Content *
              </label>
              {selectedTemplate && selectedTemplate.placeholders && selectedTemplate.placeholders.length > 0 && (
                <button
                  onClick={replacePlaceholders}
                  className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Replace Placeholders
                </button>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              placeholder="Document content (supports Markdown)..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports Markdown formatting. Use placeholders like {`{{game_name}}, {{team_name}}`} for dynamic content.
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Visibility *
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
            >
              <option value="instructor_only">Instructor Only</option>
              <option value="all_participants">All Participants</option>
              <option value="team_only">Specific Team</option>
              <option value="player_only">Specific Player</option>
            </select>
          </div>

          {/* Team Selection (if team_only) */}
          {visibility === 'team_only' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Team * {teams.length > 0 && <span className="text-xs text-gray-500">({teams.length} teams available)</span>}
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              >
                <option value="">-- Select team --</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {teams.length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  No teams found. Please ensure teams were created for this game.
                </p>
              )}
            </div>
          )}

          {/* Player Selection (if player_only) */}
          {visibility === 'player_only' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Player * {players.length > 0 && <span className="text-xs text-gray-500">({players.length} players available)</span>}
              </label>
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              >
                <option value="">-- Select player --</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              {players.length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  No players found. Player-specific documents are not yet supported.
                </p>
              )}
            </div>
          )}

          {/* Additional Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isRequiredReading}
                  onChange={(e) => setIsRequiredReading(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-semibold text-gray-700">Required Reading</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estimated Read Time (minutes)
              </label>
              <input
                type="number"
                value={estimatedReadTime}
                onChange={(e) => setEstimatedReadTime(e.target.value)}
                placeholder="e.g., 5"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
            >
              <option value="draft">Draft (not visible to participants)</option>
              <option value="published">Published (visible to participants)</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : (document ? 'Update Document' : 'Create Document')}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
