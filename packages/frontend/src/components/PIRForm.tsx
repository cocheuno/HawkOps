import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface ActionItem {
  description: string;
  owner: string;
  dueDate: string;
}

interface PIRData {
  id: string;
  incidentId: string;
  whatHappened: string;
  rootCause: string;
  whatWentWell: string | null;
  whatCouldImprove: string | null;
  actionItems: ActionItem[];
  lessonsLearned: string | null;
  aiScore: number | null;
  aiFeedback: any | null;
  status: string;
}

interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  aiContext?: any;
}

interface PIRFormProps {
  teamId: string;
  incidentId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function PIRForm({ teamId, incidentId, onClose, onSubmitted }: PIRFormProps) {
  const [pir, setPir] = useState<PIRData | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [whatHappened, setWhatHappened] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatCouldImprove, setWhatCouldImprove] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    { description: '', owner: '', dueDate: '' }
  ]);

  useEffect(() => {
    fetchPIR();
  }, [teamId, incidentId]);

  const fetchPIR = async () => {
    try {
      const response = await axios.get(`${API_URL}/teams/${teamId}/pir/${incidentId}`);
      const { pir: pirData, incident: incidentData } = response.data;
      setPir(pirData);
      setIncident(incidentData);

      // Populate form with existing data
      if (pirData) {
        setWhatHappened(pirData.whatHappened || '');
        setRootCause(pirData.rootCause || '');
        setWhatWentWell(pirData.whatWentWell || '');
        setWhatCouldImprove(pirData.whatCouldImprove || '');
        setLessonsLearned(pirData.lessonsLearned || '');
        if (pirData.actionItems && pirData.actionItems.length > 0) {
          setActionItems(pirData.actionItems);
        }
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching PIR:', error);
      toast.error('Failed to load PIR');
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!pir) return;
    setSaving(true);
    try {
      await axios.put(`${API_URL}/pir/${pir.id}`, {
        whatHappened,
        rootCause,
        whatWentWell,
        whatCouldImprove,
        actionItems: actionItems.filter(a => a.description.trim()),
        lessonsLearned,
      });
      toast.success('Draft saved');
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!pir) return;

    // Validation
    if (!whatHappened.trim()) {
      toast.error('Please describe what happened');
      return;
    }
    if (!rootCause.trim()) {
      toast.error('Please provide a root cause analysis');
      return;
    }

    setSubmitting(true);
    try {
      // Save first
      await axios.put(`${API_URL}/pir/${pir.id}`, {
        whatHappened,
        rootCause,
        whatWentWell,
        whatCouldImprove,
        actionItems: actionItems.filter(a => a.description.trim()),
        lessonsLearned,
      });

      // Then submit
      await axios.post(`${API_URL}/pir/${pir.id}/submit`);
      toast.success('PIR submitted for grading. Results will be available shortly.');
      onSubmitted?.();
      onClose();
    } catch (error: any) {
      console.error('Error submitting PIR:', error);
      toast.error(error.response?.data?.message || 'Failed to submit PIR');
    } finally {
      setSubmitting(false);
    }
  };

  const addActionItem = () => {
    setActionItems([...actionItems, { description: '', owner: '', dueDate: '' }]);
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const updateActionItem = (index: number, field: keyof ActionItem, value: string) => {
    const updated = [...actionItems];
    updated[index][field] = value;
    setActionItems(updated);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Loading PIR...</p>
        </div>
      </div>
    );
  }

  const isGraded = pir?.status === 'graded';
  const isSubmitted = pir?.status === 'submitted';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-hawk-purple text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Post-Incident Review</h2>
              {incident && (
                <p className="text-purple-200 mt-1">
                  {incident.incidentNumber}: {incident.title}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-white text-2xl hover:opacity-75">
              ✕
            </button>
          </div>
          {isGraded && pir?.aiScore !== null && (
            <div className="mt-4 flex items-center gap-4">
              <div className={`text-3xl font-bold ${
                pir.aiScore >= 80 ? 'text-green-300' :
                pir.aiScore >= 60 ? 'text-yellow-300' :
                'text-red-300'
              }`}>
                Score: {pir.aiScore}/100
              </div>
              <span className="text-purple-200">AI Graded</span>
            </div>
          )}
          {isSubmitted && !isGraded && (
            <div className="mt-4 text-yellow-300">
              Submitted - Awaiting AI grading...
            </div>
          )}
        </div>

        {/* Incident Context */}
        {incident && (
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Incident Context</h3>
            <p className="text-gray-600 text-sm">{incident.description}</p>
            {incident.aiContext?.teachingPoint && (
              <div className="mt-2 bg-purple-50 p-3 rounded text-sm">
                <span className="font-semibold text-purple-700">Teaching Point: </span>
                <span className="text-purple-600">{incident.aiContext.teachingPoint}</span>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* What Happened */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              What Happened? <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal text-sm ml-2">(Timeline of events)</span>
            </label>
            <textarea
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              disabled={isSubmitted || isGraded}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-hawk-purple disabled:bg-gray-100"
              rows={4}
              placeholder="Describe the sequence of events from detection to resolution..."
            />
            {isGraded && pir?.aiFeedback?.whatHappened && (
              <div className="mt-2 bg-blue-50 p-3 rounded text-sm">
                <span className="font-semibold text-blue-700">
                  Score: {pir.aiFeedback.whatHappened.score}/25 -
                </span>
                <span className="text-blue-600 ml-1">{pir.aiFeedback.whatHappened.feedback}</span>
              </div>
            )}
          </div>

          {/* Root Cause */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              Root Cause Analysis <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal text-sm ml-2">(The underlying cause, not symptoms)</span>
            </label>
            <textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              disabled={isSubmitted || isGraded}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-hawk-purple disabled:bg-gray-100"
              rows={4}
              placeholder="What was the root cause? Use techniques like 5 Whys or Fishbone analysis..."
            />
            {isGraded && pir?.aiFeedback?.rootCause && (
              <div className="mt-2 bg-blue-50 p-3 rounded text-sm">
                <span className="font-semibold text-blue-700">
                  Score: {pir.aiFeedback.rootCause.score}/35 -
                </span>
                <span className="text-blue-600 ml-1">{pir.aiFeedback.rootCause.feedback}</span>
              </div>
            )}
          </div>

          {/* What Went Well */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              What Went Well?
              <span className="text-gray-400 font-normal text-sm ml-2">(Positive aspects of the response)</span>
            </label>
            <textarea
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              disabled={isSubmitted || isGraded}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-hawk-purple disabled:bg-gray-100"
              rows={2}
              placeholder="What aspects of the incident response worked effectively?"
            />
          </div>

          {/* What Could Improve */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              What Could Improve?
              <span className="text-gray-400 font-normal text-sm ml-2">(Areas for improvement)</span>
            </label>
            <textarea
              value={whatCouldImprove}
              onChange={(e) => setWhatCouldImprove(e.target.value)}
              disabled={isSubmitted || isGraded}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-hawk-purple disabled:bg-gray-100"
              rows={2}
              placeholder="What could have been done better?"
            />
          </div>

          {/* Action Items */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              Action Items
              <span className="text-gray-400 font-normal text-sm ml-2">(Preventive measures)</span>
            </label>
            <div className="space-y-3">
              {actionItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateActionItem(index, 'description', e.target.value)}
                    disabled={isSubmitted || isGraded}
                    className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-hawk-purple disabled:bg-gray-100"
                    placeholder="Action item description"
                  />
                  <input
                    type="text"
                    value={item.owner}
                    onChange={(e) => updateActionItem(index, 'owner', e.target.value)}
                    disabled={isSubmitted || isGraded}
                    className="w-32 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-hawk-purple disabled:bg-gray-100"
                    placeholder="Owner"
                  />
                  {!isSubmitted && !isGraded && actionItems.length > 1 && (
                    <button
                      onClick={() => removeActionItem(index)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {!isSubmitted && !isGraded && (
                <button
                  onClick={addActionItem}
                  className="text-hawk-purple hover:text-purple-800 text-sm font-semibold"
                >
                  + Add Action Item
                </button>
              )}
            </div>
            {isGraded && pir?.aiFeedback?.actionItems && (
              <div className="mt-2 bg-blue-50 p-3 rounded text-sm">
                <span className="font-semibold text-blue-700">
                  Score: {pir.aiFeedback.actionItems.score}/20 -
                </span>
                <span className="text-blue-600 ml-1">{pir.aiFeedback.actionItems.feedback}</span>
              </div>
            )}
          </div>

          {/* Lessons Learned */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              Lessons Learned
              <span className="text-gray-400 font-normal text-sm ml-2">(Key takeaways for the team)</span>
            </label>
            <textarea
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              disabled={isSubmitted || isGraded}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hawk-purple focus:border-hawk-purple disabled:bg-gray-100"
              rows={3}
              placeholder="What key lessons should the team take away from this incident?"
            />
            {isGraded && pir?.aiFeedback?.lessonsLearned && (
              <div className="mt-2 bg-blue-50 p-3 rounded text-sm">
                <span className="font-semibold text-blue-700">
                  Score: {pir.aiFeedback.lessonsLearned.score}/20 -
                </span>
                <span className="text-blue-600 ml-1">{pir.aiFeedback.lessonsLearned.feedback}</span>
              </div>
            )}
          </div>

          {/* AI Feedback Summary */}
          {isGraded && pir?.aiFeedback && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Overall Feedback</h4>
              <p className="text-green-700">{pir.aiFeedback.overall}</p>
              {pir.aiFeedback.suggestions && pir.aiFeedback.suggestions.length > 0 && (
                <div className="mt-3">
                  <h5 className="font-semibold text-green-800 text-sm">Suggestions for Improvement:</h5>
                  <ul className="list-disc list-inside text-green-700 text-sm mt-1">
                    {pir.aiFeedback.suggestions.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-4 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            {isGraded ? 'Close' : 'Cancel'}
          </button>
          {!isSubmitted && !isGraded && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-hawk-purple text-white rounded-lg hover:bg-purple-800 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit for Grading'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
