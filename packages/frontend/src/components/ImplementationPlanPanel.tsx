import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface ImplementationPlan {
  id: string;
  plan_number: string;
  title: string;
  description: string;
  status: string;
  root_cause_analysis?: string;
  affected_systems?: string[];
  implementation_steps?: any[];
  estimated_effort_hours?: number;
  required_resources?: string;
  estimated_cost?: number;
  risk_level: string;
  mitigation_strategy?: string;
  rollback_plan?: string;
  incident_id?: string;
  incident_title?: string;
  incident_number?: string;
  ai_evaluation?: any;
  ai_evaluation_score?: number;
  ai_suggestions?: string[];
  created_at: string;
}

interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  status: string;
}

interface ImplementationPlanPanelProps {
  gameId: string;
  teamId: string;
  incidents?: Incident[];
  compact?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ai_reviewing: 'AI Reviewing',
  ai_approved: 'AI Approved',
  ai_needs_revision: 'Needs Revision',
  ai_rejected: 'AI Rejected',
  implementing: 'Implementing',
  completed: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ai_reviewing: 'bg-blue-100 text-blue-700',
  ai_approved: 'bg-green-100 text-green-700',
  ai_needs_revision: 'bg-yellow-100 text-yellow-700',
  ai_rejected: 'bg-red-100 text-red-700',
  implementing: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-200 text-gray-800',
};

export default function ImplementationPlanPanel({
  gameId,
  teamId,
  incidents = [],
  compact = false,
}: ImplementationPlanPanelProps) {
  const [plans, setPlans] = useState<ImplementationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ImplementationPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/teams/${teamId}/implementation-plans?gameId=${gameId}`
      );
      setPlans(response.data.plans || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching implementation plans:', error);
      setLoading(false);
    }
  }, [gameId, teamId]);

  useEffect(() => {
    fetchPlans();
    const interval = setInterval(fetchPlans, 10000); // Poll for AI evaluation updates
    return () => clearInterval(interval);
  }, [fetchPlans]);

  const handleCreatePlan = async (planData: any) => {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/teams/${teamId}/implementation-plans`, {
        gameId,
        ...planData,
      });
      toast.success('Implementation plan created');
      setShowCreateModal(false);
      fetchPlans();
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast.error(error.response?.data?.error || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async (planId: string) => {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/teams/${teamId}/implementation-plans/${planId}/submit`);
      toast.success('Plan submitted for AI evaluation');
      fetchPlans();
    } catch (error: any) {
      console.error('Error submitting plan:', error);
      toast.error(error.response?.data?.error || 'Failed to submit plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartImplementation = async (planId: string) => {
    try {
      await axios.post(`${API_URL}/teams/${teamId}/implementation-plans/${planId}/implement`);
      toast.success('Implementation started');
      fetchPlans();
      setSelectedPlan(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start implementation');
    }
  };

  const handleCompleteImplementation = async (planId: string) => {
    try {
      await axios.post(`${API_URL}/teams/${teamId}/implementation-plans/${planId}/complete`);
      toast.success('Implementation completed!');
      fetchPlans();
      setSelectedPlan(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to complete implementation');
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

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">📋</span> Implementation Plans
          </h3>
          <span className="text-sm text-gray-500">{plans.length} plans</span>
        </div>

        <div className="space-y-2">
          {plans.slice(0, 3).map((plan) => (
            <div
              key={plan.id}
              className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
              onClick={() => setSelectedPlan(plan)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 truncate">{plan.title}</p>
                <p className="text-xs text-gray-500">{plan.plan_number}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[plan.status]}`}>
                {STATUS_LABELS[plan.status]}
              </span>
            </div>
          ))}

          {plans.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">No plans yet</p>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full mt-3 text-sm bg-hawk-purple text-white py-2 px-4 rounded hover:bg-purple-800 transition-colors"
        >
          + Create Implementation Plan
        </button>

        {/* Modals */}
        {showCreateModal && (
          <CreatePlanModal
            incidents={incidents}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreatePlan}
            submitting={submitting}
          />
        )}

        {selectedPlan && (
          <PlanDetailModal
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
            onSubmitForReview={handleSubmitForReview}
            onStartImplementation={handleStartImplementation}
            onCompleteImplementation={handleCompleteImplementation}
            submitting={submitting}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Implementation Plans</h2>
          <p className="text-sm text-gray-500">
            Create plans to resolve issues and get AI feedback
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-hawk-purple text-white py-2 px-4 rounded hover:bg-purple-800 transition-colors"
        >
          + Create Plan
        </button>
      </div>

      <div className="p-4">
        {plans.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500">No implementation plans yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create a plan to document how you'll resolve an issue
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-500">{plan.plan_number}</span>
                      <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[plan.status]}`}>
                        {STATUS_LABELS[plan.status]}
                      </span>
                      {plan.ai_evaluation_score !== null && plan.ai_evaluation_score !== undefined && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          Score: {plan.ai_evaluation_score}/100
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-800 mt-1">{plan.title}</h4>
                  </div>
                  {plan.incident_number && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {plan.incident_number}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  {plan.risk_level && (
                    <span>Risk: {plan.risk_level}</span>
                  )}
                  {plan.estimated_effort_hours && (
                    <span>Est. effort: {plan.estimated_effort_hours}h</span>
                  )}
                  <span>Created: {new Date(plan.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePlanModal
          incidents={incidents}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePlan}
          submitting={submitting}
        />
      )}

      {selectedPlan && (
        <PlanDetailModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSubmitForReview={handleSubmitForReview}
          onStartImplementation={handleStartImplementation}
          onCompleteImplementation={handleCompleteImplementation}
          submitting={submitting}
        />
      )}
    </div>
  );
}

// Create Plan Modal
function CreatePlanModal({
  incidents,
  onClose,
  onSubmit,
  submitting,
}: {
  incidents: Incident[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState({
    incidentId: '',
    title: '',
    description: '',
    rootCauseAnalysis: '',
    implementationSteps: [''],
    estimatedEffortHours: '',
    riskLevel: 'medium',
    mitigationStrategy: '',
    rollbackPlan: '',
  });

  const handleAddStep = () => {
    setFormData({
      ...formData,
      implementationSteps: [...formData.implementationSteps, ''],
    });
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...formData.implementationSteps];
    newSteps[index] = value;
    setFormData({ ...formData, implementationSteps: newSteps });
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = formData.implementationSteps.filter((_, i) => i !== index);
    setFormData({ ...formData, implementationSteps: newSteps.length > 0 ? newSteps : [''] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      incidentId: formData.incidentId || null,
      estimatedEffortHours: formData.estimatedEffortHours
        ? parseInt(formData.estimatedEffortHours)
        : null,
      implementationSteps: formData.implementationSteps.filter((s) => s.trim()),
    });
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
        <div className="bg-hawk-purple text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create Implementation Plan</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Link to Incident (optional) */}
          {incidents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Incident (optional)
              </label>
              <select
                value={formData.incidentId}
                onChange={(e) => setFormData({ ...formData, incidentId: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">No linked incident</option>
                {incidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    {incident.incidentNumber} - {incident.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="e.g., Database Connection Pool Fix"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Describe the overall approach to resolve the issue"
            />
          </div>

          {/* Root Cause Analysis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Root Cause Analysis
            </label>
            <textarea
              value={formData.rootCauseAnalysis}
              onChange={(e) => setFormData({ ...formData, rootCauseAnalysis: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="What is the underlying cause of this issue?"
            />
          </div>

          {/* Implementation Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Implementation Steps
            </label>
            <div className="space-y-2">
              {formData.implementationSteps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-gray-500 py-2 w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                    placeholder={`Step ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddStep}
                className="text-sm text-hawk-purple hover:text-purple-800"
              >
                + Add Step
              </button>
            </div>
          </div>

          {/* Row: Effort and Risk */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Effort (hours)
              </label>
              <input
                type="number"
                value={formData.estimatedEffortHours}
                onChange={(e) => setFormData({ ...formData, estimatedEffortHours: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="e.g., 4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select
                value={formData.riskLevel}
                onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Mitigation Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risk Mitigation Strategy
            </label>
            <textarea
              value={formData.mitigationStrategy}
              onChange={(e) => setFormData({ ...formData, mitigationStrategy: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="How will you minimize risks during implementation?"
            />
          </div>

          {/* Rollback Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rollback Plan</label>
            <textarea
              value={formData.rollbackPlan}
              onChange={(e) => setFormData({ ...formData, rollbackPlan: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="What's the plan if something goes wrong?"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-hawk-purple text-white rounded hover:bg-purple-800 disabled:bg-gray-400"
            >
              {submitting ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Plan Detail Modal
function PlanDetailModal({
  plan,
  onClose,
  onSubmitForReview,
  onStartImplementation,
  onCompleteImplementation,
  submitting,
}: {
  plan: ImplementationPlan;
  onClose: () => void;
  onSubmitForReview: (planId: string) => void;
  onStartImplementation: (planId: string) => void;
  onCompleteImplementation: (planId: string) => void;
  submitting: boolean;
}) {
  const canSubmit = plan.status === 'draft' || plan.status === 'ai_needs_revision';
  const canStart = plan.status === 'ai_approved';
  const canComplete = plan.status === 'implementing';
  const hasAIFeedback = plan.ai_evaluation;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-hawk-purple text-white px-6 py-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-80">{plan.plan_number}</span>
              <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[plan.status]}`}>
                {STATUS_LABELS[plan.status]}
              </span>
            </div>
            <h2 className="text-xl font-bold">{plan.title}</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
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

        <div className="p-6">
          {/* Linked Incident */}
          {plan.incident_number && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Linked to:</span> {plan.incident_number} -{' '}
                {plan.incident_title}
              </p>
            </div>
          )}

          {/* AI Feedback Section */}
          {hasAIFeedback && (
            <div className={`rounded-lg p-4 mb-4 ${
              plan.status === 'ai_approved' ? 'bg-green-50' :
              plan.status === 'ai_rejected' ? 'bg-red-50' :
              'bg-yellow-50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">AI Evaluation</h3>
                {plan.ai_evaluation_score !== null && (
                  <span className={`text-lg font-bold ${
                    (plan.ai_evaluation_score || 0) >= 70 ? 'text-green-600' :
                    (plan.ai_evaluation_score || 0) >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    Score: {plan.ai_evaluation_score}/100
                  </span>
                )}
              </div>

              {plan.ai_evaluation.overallFeedback && (
                <p className="text-gray-700 mb-3">{plan.ai_evaluation.overallFeedback}</p>
              )}

              {plan.ai_evaluation.strengths?.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-green-700">Strengths:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {plan.ai_evaluation.strengths.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.ai_evaluation.suggestions?.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-yellow-700">Suggestions:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {plan.ai_evaluation.suggestions.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.ai_evaluation.criticalIssues?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-700">Critical Issues:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {plan.ai_evaluation.criticalIssues.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Plan Status Message */}
          {plan.status === 'ai_reviewing' && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
              <p className="text-blue-700">AI is reviewing your plan. This may take a moment...</p>
            </div>
          )}

          {/* Plan Details */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Description</h4>
              <p className="text-gray-800">{plan.description}</p>
            </div>

            {plan.root_cause_analysis && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Root Cause Analysis</h4>
                <p className="text-gray-800">{plan.root_cause_analysis}</p>
              </div>
            )}

            {plan.implementation_steps && plan.implementation_steps.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Implementation Steps</h4>
                <ol className="list-decimal list-inside text-gray-800 space-y-1">
                  {plan.implementation_steps.map((step: any, i: number) => (
                    <li key={i}>{typeof step === 'string' ? step : step.description || step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {plan.estimated_effort_hours && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Estimated Effort</h4>
                  <p className="text-gray-800">{plan.estimated_effort_hours} hours</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-500">Risk Level</h4>
                <p className={`font-semibold ${
                  plan.risk_level === 'low' ? 'text-green-600' :
                  plan.risk_level === 'medium' ? 'text-yellow-600' :
                  plan.risk_level === 'high' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {plan.risk_level.charAt(0).toUpperCase() + plan.risk_level.slice(1)}
                </p>
              </div>
            </div>

            {plan.mitigation_strategy && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Mitigation Strategy</h4>
                <p className="text-gray-800">{plan.mitigation_strategy}</p>
              </div>
            )}

            {plan.rollback_plan && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Rollback Plan</h4>
                <p className="text-gray-800">{plan.rollback_plan}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>

            {canSubmit && (
              <button
                onClick={() => onSubmitForReview(plan.id)}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? 'Submitting...' : 'Submit for AI Review'}
              </button>
            )}

            {canStart && (
              <button
                onClick={() => onStartImplementation(plan.id)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Implementation
              </button>
            )}

            {canComplete && (
              <button
                onClick={() => onCompleteImplementation(plan.id)}
                className="px-4 py-2 bg-hawk-purple text-white rounded hover:bg-purple-800"
              >
                Complete Implementation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
