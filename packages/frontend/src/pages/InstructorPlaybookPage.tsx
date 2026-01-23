import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Navigation from '../components/Navigation';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface PlaybookDocument {
  id: string;
  documentType: string;
  title: string;
  content: string;
  visibility: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function InstructorPlaybookPage() {
  const { gameId } = useParams();
  const [playbook, setPlaybook] = useState<PlaybookDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameName, setGameName] = useState('');

  useEffect(() => {
    const fetchPlaybook = async () => {
      try {
        // Fetch game name
        const gameResponse = await axios.get(`${API_URL}/instructor/games/${gameId}/state`);
        setGameName(gameResponse.data.game.name);

        // Fetch playbook document
        const response = await axios.get(`${API_URL}/documents/games/${gameId}`);
        const instructorPlaybook = response.data.documents.find(
          (doc: PlaybookDocument) => doc.documentType === 'instructor_playbook'
        );

        if (instructorPlaybook) {
          setPlaybook(instructorPlaybook);
        }
      } catch (error: any) {
        console.error('Error fetching playbook:', error);
        toast.error('Failed to fetch playbook');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaybook();
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading playbook...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation title={`Instructor Playbook - ${gameName}`} showBack={true} />
      <div className="max-w-5xl mx-auto px-6 pb-6">
        {/* Warning Banner */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold text-yellow-800">Instructor Only</p>
              <p className="text-sm text-yellow-700">This playbook contains facilitation notes and solutions. Do not share with students.</p>
            </div>
          </div>
        </div>

        {playbook ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{playbook.title}</h1>
                <div className="flex gap-3 text-sm text-gray-500">
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-semibold">
                    {playbook.visibility.replace('_', ' ')}
                  </span>
                  <span>Status: {playbook.status}</span>
                  <span>Created: {new Date(playbook.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>

            {/* Playbook Content - Rendered as Markdown-like content */}
            <div className="prose prose-lg max-w-none">
              {playbook.content.split('\n').map((line, index) => {
                // Handle headers
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold text-gray-900 mt-8 mb-4">{line.substring(2)}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-bold text-gray-800 mt-6 mb-3">{line.substring(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-semibold text-gray-700 mt-5 mb-2">{line.substring(4)}</h3>;
                }
                // Handle bullet points
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <div key={index} className="flex gap-2 ml-4 text-gray-700">
                      <span className="text-hawk-purple">-</span>
                      <span>{line.substring(2)}</span>
                    </div>
                  );
                }
                // Handle numbered lists
                if (/^\d+\.\s/.test(line)) {
                  const [, num, text] = line.match(/^(\d+\.)\s(.*)$/) || [];
                  return (
                    <div key={index} className="flex gap-2 ml-4 text-gray-700">
                      <span className="text-hawk-purple font-semibold">{num}</span>
                      <span>{text}</span>
                    </div>
                  );
                }
                // Handle bold text sections
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={index} className="font-bold text-gray-800 mt-4">{line.replace(/\*\*/g, '')}</p>;
                }
                // Empty lines
                if (line.trim() === '') {
                  return <div key={index} className="h-4"></div>;
                }
                // Regular paragraphs
                return <p key={index} className="text-gray-700 leading-relaxed">{line}</p>;
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Playbook Generated</h2>
            <p className="text-gray-600 mb-4">
              The instructor playbook will be generated when you create an AI scenario.
            </p>
            <a
              href={`/instructor/game/${gameId}/ai-generate`}
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded transition-colors"
            >
              Generate AI Scenario
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
