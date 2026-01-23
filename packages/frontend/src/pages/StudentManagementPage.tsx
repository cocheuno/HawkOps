import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Navigation from '../components/Navigation';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface Student {
  id: string;
  student_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  department: string | null;
  notes: string | null;
  is_active: boolean;
}

interface Player {
  playerId: string;
  studentId: string | null;
  name: string;
  student?: Student;
}

interface TeamAssignment {
  id: string;
  name: string;
  role: string;
  players: Player[];
}

export default function StudentManagementPage() {
  const { gameId } = useParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<TeamAssignment[]>([]);
  const [, setUnassigned] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameName, setGameName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    department: '',
  });
  const [bulkText, setBulkText] = useState('');
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchData();
  }, [gameId]);

  const fetchData = async () => {
    try {
      // Fetch game info
      const gameResponse = await axios.get(`${API_URL}/instructor/games/${gameId}/state`);
      setGameName(gameResponse.data.game.name);

      // Fetch all students
      const studentsResponse = await axios.get(`${API_URL}/instructor/students`);
      setStudents(studentsResponse.data.students);

      // Fetch team assignments
      const assignmentsResponse = await axios.get(`${API_URL}/instructor/games/${gameId}/team-assignments`);
      setTeams(assignmentsResponse.data.teams);
      setUnassigned(assignmentsResponse.data.unassigned || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.firstName || !newStudent.lastName) {
      toast.error('First name and last name are required');
      return;
    }

    try {
      await axios.post(`${API_URL}/instructor/students`, newStudent);
      toast.success('Student added successfully');
      setShowAddModal(false);
      setNewStudent({ firstName: '', lastName: '', email: '', studentId: '', department: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.response?.data?.error || 'Failed to add student');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) {
      toast.error('Please enter student data');
      return;
    }

    // Parse CSV format: firstName,lastName,email,studentId,department
    const lines = bulkText.trim().split('\n');
    const students = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        firstName: parts[0] || '',
        lastName: parts[1] || '',
        email: parts[2] || '',
        studentId: parts[3] || '',
        department: parts[4] || '',
      };
    }).filter((s) => s.firstName && s.lastName);

    if (students.length === 0) {
      toast.error('No valid students found. Format: firstName,lastName,email,studentId,department');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/instructor/students/bulk`, { students });
      toast.success(`${response.data.created} students imported`);
      setShowBulkModal(false);
      setBulkText('');
      fetchData();
    } catch (error: any) {
      console.error('Error importing students:', error);
      toast.error('Failed to import students');
    }
  };

  const handleAssignStudent = async (studentId: string, teamId: string) => {
    try {
      await axios.post(`${API_URL}/instructor/games/${gameId}/teams/${teamId}/assign-student`, { studentId });
      toast.success('Student assigned to team');
      fetchData();
    } catch (error: any) {
      console.error('Error assigning student:', error);
      toast.error('Failed to assign student');
    }
  };

  const handleRemoveFromTeam = async (teamId: string, playerId: string) => {
    try {
      await axios.delete(`${API_URL}/instructor/games/${gameId}/teams/${teamId}/players/${playerId}`);
      toast.success('Student removed from team');
      fetchData();
    } catch (error: any) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
    }
  };

  const handleDrop = (teamId: string) => {
    if (draggedStudent) {
      handleAssignStudent(draggedStudent.id, teamId);
      setDraggedStudent(null);
    }
  };

  // Get students not assigned to any team in this game
  const getUnassignedStudents = () => {
    const assignedStudentIds = new Set<string>();
    teams.forEach((team) => {
      team.players.forEach((player) => {
        if (player.studentId) {
          assignedStudentIds.add(player.studentId);
        }
      });
    });
    return students.filter((s) => !assignedStudentIds.has(s.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading student management...</div>
      </div>
    );
  }

  const unassignedStudents = getUnassignedStudents();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation title={`Student Management - ${gameName}`} showBack={true} />
      <div className="max-w-7xl mx-auto px-6 pb-6">
        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Student Roster</h2>
            <p className="text-sm text-gray-600">{students.length} students in roster</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Student
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Bulk Import
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unassigned Students */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Unassigned Students ({unassignedStudents.length})
              </h3>
              <p className="text-xs text-gray-500 mb-3">Drag students to a team to assign them</p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {unassignedStudents.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">All students are assigned</p>
                ) : (
                  unassignedStudents.map((student) => (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={() => setDraggedStudent(student)}
                      onDragEnd={() => setDraggedStudent(null)}
                      className="bg-gray-50 border border-gray-200 rounded p-3 cursor-move hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-semibold text-gray-800">
                        {student.first_name} {student.last_name}
                      </p>
                      {student.email && (
                        <p className="text-xs text-gray-500">{student.email}</p>
                      )}
                      {student.department && (
                        <p className="text-xs text-gray-400">{student.department}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(team.id)}
                  className={`bg-white rounded-lg shadow-md p-4 border-2 transition-colors ${
                    draggedStudent ? 'border-dashed border-green-400' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800">{team.name}</h3>
                      <p className="text-xs text-gray-500">{team.role}</p>
                    </div>
                    <span className="bg-hawk-purple text-white text-xs px-2 py-1 rounded">
                      {team.players.length} members
                    </span>
                  </div>

                  <div className="space-y-2 min-h-[100px]">
                    {team.players.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">
                        Drop students here
                      </p>
                    ) : (
                      team.players.map((player) => (
                        <div
                          key={player.playerId}
                          className="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{player.name}</p>
                            {player.student?.email && (
                              <p className="text-xs text-gray-500">{player.student.email}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveFromTeam(team.id, player.playerId)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove from team"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick assign dropdown */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignStudent(e.target.value, team.id);
                        }
                      }}
                      className="w-full text-sm border border-gray-300 rounded p-2"
                    >
                      <option value="">Quick assign...</option>
                      {unassignedStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Student</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={newStudent.firstName}
                      onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={newStudent.lastName}
                      onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2"
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Student ID</label>
                    <input
                      type="text"
                      value={newStudent.studentId}
                      onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2"
                      placeholder="STU001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={newStudent.department}
                      onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2"
                      placeholder="IT"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
                >
                  Add Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Bulk Import Students</h3>
              <p className="text-sm text-gray-600 mb-3">
                Enter student data in CSV format, one student per line:
              </p>
              <p className="text-xs text-gray-500 mb-3 font-mono bg-gray-100 p-2 rounded">
                firstName,lastName,email,studentId,department
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full border border-gray-300 rounded p-3 h-48 font-mono text-sm"
                placeholder="John,Doe,john@example.com,STU001,IT&#10;Jane,Smith,jane@example.com,STU002,HR"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
                >
                  Import Students
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
