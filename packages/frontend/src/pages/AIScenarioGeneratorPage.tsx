import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Navigation from '../components/Navigation';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

const ITSM_DOMAINS = [
  'Incident Management',
  'Problem Management',
  'Release Management',
  'Service Level Agreements',
  'Customer Communications',
  'Business Continuity',
  'Disaster Recovery',
  'Cybersecurity and Information Assurance',
  'Project Management',
  'Program Management',
];

interface Scenario {
  id?: string;
  title: string;
  description: string;
  learningObjectives: string[];
  primaryDomain: string;
  secondaryDomains: string[];
  keyChallenges: string[];
  difficulty: number;
}

export default function AIScenarioGeneratorPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState(5);
  const [estimatedDuration, setEstimatedDuration] = useState(75);

  const [generating, setGenerating] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatingDocs, setGeneratingDocs] = useState(false);

  const toggleDomain = (domain: string) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const handleGenerateScenarios = async () => {
    if (selectedDomains.length === 0) {
      toast.error('Please select at least one ITSM domain');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API_URL}/instructor/ai/generate-scenarios`, {
        domains: selectedDomains,
        additionalContext: additionalContext.trim() || undefined,
        difficultyLevel,
        estimatedDuration,
      });

      setScenarios(response.data.scenarios);
      setGenerationId(response.data.generationId);
      toast.success('Scenarios generated successfully!');
    } catch (error: any) {
      console.error('Error generating scenarios:', error);
      toast.error(error.response?.data?.error || 'Failed to generate scenarios');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleGenerateDocuments = async () => {
    if (!selectedScenario) {
      toast.error('Please select a scenario first');
      return;
    }

    setGeneratingDocs(true);
    try {
      const response = await axios.post(
        `${API_URL}/instructor/games/${gameId}/ai/generate-documents`,
        {
          scenario: selectedScenario,
          generationId,
        }
      );

      toast.success(`Generated ${response.data.documentsCreated} documents!`);

      // Navigate to document manager to review the generated documents
      setTimeout(() => {
        navigate(`/instructor/game/${gameId}/documents`);
      }, 1500);
    } catch (error: any) {
      console.error('Error generating documents:', error);
      toast.error(error.response?.data?.error || 'Failed to generate documents');
    } finally {
      setGeneratingDocs(false);
    }
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 3) return 'Beginner';
    if (level <= 6) return 'Intermediate';
    if (level <= 8) return 'Advanced';
    return 'Expert';
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 3) return 'text-green-600';
    if (level <= 6) return 'text-blue-600';
    if (level <= 8) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation title="AI Scenario Generator" backPath={`/instructor/game/${gameId}`} />
      <div className="max-w-7xl mx-auto px-6 pb-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Generate Simulation with AI</h1>
          <p className="text-gray-600">
            Select ITSM domains and preferences, then AI will generate 5 scenario options with complete briefing documents
          </p>
        </div>

        {/* Domain Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select ITSM Domain Areas</h2>
          <p className="text-sm text-gray-600 mb-4">Choose one or more domains to focus on (at least one required)</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ITSM_DOMAINS.map((domain) => (
              <label
                key={domain}
                className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedDomains.includes(domain)
                    ? 'border-hawk-purple bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDomains.includes(domain)}
                  onChange={() => toggleDomain(domain)}
                  className="w-5 h-5 text-hawk-purple focus:ring-hawk-purple"
                />
                <span className="ml-3 text-sm font-medium text-gray-800">{domain}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">2. Configure Parameters</h2>

          {/* Additional Context */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Context (Optional)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g., Healthcare industry, focus on patient data protection, mid-sized organization..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide industry, company size, specific requirements, or other context to customize scenarios
            </p>
          </div>

          {/* Difficulty Slider */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Difficulty Level: <span className={`font-bold ${getDifficultyColor(difficultyLevel)}`}>
                {difficultyLevel}/10 - {getDifficultyLabel(difficultyLevel)}
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Advanced</span>
              <span>Expert</span>
            </div>
          </div>

          {/* Duration Slider */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Estimated Duration: <span className="font-bold text-blue-600">{estimatedDuration} minutes</span>
            </label>
            <input
              type="range"
              min="30"
              max="180"
              step="15"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30 min</span>
              <span>90 min</span>
              <span>180 min</span>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">3. Generate Scenarios</h2>
          <button
            onClick={handleGenerateScenarios}
            disabled={generating || selectedDomains.length === 0}
            className="w-full bg-hawk-purple hover:bg-purple-800 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Scenarios...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate 5 AI Scenarios
              </>
            )}
          </button>
          {selectedDomains.length === 0 && (
            <p className="text-sm text-red-600 mt-2 text-center">Please select at least one domain to continue</p>
          )}
        </div>

        {/* Scenarios Display */}
        {scenarios.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">4. Select Your Scenario</h2>
            <p className="text-sm text-gray-600 mb-6">
              Review the AI-generated scenarios below and select one to proceed with document generation
            </p>

            <div className="space-y-4">
              {scenarios.map((scenario, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedScenario === scenario
                      ? 'border-hawk-purple bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectScenario(scenario)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-800 flex-1">{scenario.title}</h3>
                    <span className={`text-sm font-semibold px-3 py-1 rounded ${getDifficultyColor(scenario.difficulty)} bg-gray-100 ml-4`}>
                      {scenario.difficulty}/10
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4 leading-relaxed">{scenario.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Learning Objectives:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {scenario.learningObjectives.map((obj, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-hawk-purple mr-2">•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Challenges:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {scenario.keyChallenges.map((challenge, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-orange-500 mr-2">•</span>
                            <span>{challenge}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                      Primary: {scenario.primaryDomain}
                    </span>
                    {scenario.secondaryDomains.map((domain, i) => (
                      <span key={i} className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {domain}
                      </span>
                    ))}
                  </div>

                  {selectedScenario === scenario && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-hawk-purple font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Selected - Click "Generate Documents" below
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Documents Button */}
        {selectedScenario && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">5. Generate Simulation Documents</h2>
            <p className="text-sm text-gray-600 mb-4">
              AI will generate an instructor playbook, general briefing, and team-specific packets for your selected scenario.
            </p>
            <button
              onClick={handleGenerateDocuments}
              disabled={generatingDocs}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              {generatingDocs ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Documents...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Documents & Review
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
