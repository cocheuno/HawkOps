interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  priority: string;
  severity: string;
  status: string;
  slaDeadline?: string | null;
  createdAt?: string;
  updatedAt?: string;
  aiContext?: any;
}

interface IncidentDetailModalProps {
  incident: Incident;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}

export default function IncidentDetailModal({
  incident,
  onClose,
  onStatusChange,
}: IncidentDetailModalProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-purple-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-80">{incident.incidentNumber}</span>
              <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(incident.priority)}`}>
                {incident.priority.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1">{incident.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-500">Status:</span>
            <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(incident.status)}`}>
              {incident.status.replace('_', ' ')}
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{incident.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <span className="text-sm text-gray-500">Severity</span>
              <p className="font-semibold capitalize">{incident.severity}</p>
            </div>
            {incident.slaDeadline && (
              <div>
                <span className="text-sm text-gray-500">SLA Deadline</span>
                <p className="font-semibold">{new Date(incident.slaDeadline).toLocaleString()}</p>
              </div>
            )}
            {incident.createdAt && (
              <div>
                <span className="text-sm text-gray-500">Created</span>
                <p className="font-semibold">{new Date(incident.createdAt).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* AI Context (if available) */}
          {incident.aiContext && (
            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-purple-700 mb-2">Learning Point</h3>
              <p className="text-gray-700">{incident.aiContext.teachingPoint || 'No teaching point available'}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>

            {incident.status === 'open' && (
              <button
                onClick={() => onStatusChange('in_progress')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Start Working
              </button>
            )}

            {incident.status === 'in_progress' && (
              <button
                onClick={() => onStatusChange('resolved')}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Mark Resolved
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
