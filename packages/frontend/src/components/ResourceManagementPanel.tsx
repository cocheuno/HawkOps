import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface TeamResource {
  id: string;
  teamId: string;
  teamName: string;
  totalStaff: number;
  availableStaff: number;
  skillLevel: number;
  maxConcurrentIncidents: number;
  currentWorkload: number;
  fatigueLevel: number;
}

interface ShiftSchedule {
  id: string;
  teamId: string;
  shiftName: string;
  startHour: number;
  endHour: number;
  staffCount: number;
  daysOfWeek: number[];
  isActive: boolean;
}

interface CapacityStatus {
  teamId: string;
  teamName: string;
  currentCapacity: number;
  maxCapacity: number;
  utilizationPercent: number;
  status: 'available' | 'busy' | 'overloaded';
  activeIncidents: number;
  activeChanges: number;
}

interface ResourceManagementPanelProps {
  gameId: string;
  teamId?: string;
  isInstructor?: boolean;
  compact?: boolean;
}

export default function ResourceManagementPanel({ gameId, teamId: _teamId, isInstructor = false, compact = false }: ResourceManagementPanelProps) {
  const [resources, setResources] = useState<TeamResource[]>([]);
  const [capacityStatus, setCapacityStatus] = useState<CapacityStatus[]>([]);
  const [shifts, setShifts] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShiftEditor, setShowShiftEditor] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
    const interval = setInterval(fetchResources, 30000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchResources = async () => {
    try {
      const [resourcesRes, capacityRes] = await Promise.all([
        axios.get(`${API_URL}/games/${gameId}/resources`),
        axios.get(`${API_URL}/games/${gameId}/resources/capacity`)
      ]);
      setResources(resourcesRes.data);
      setCapacityStatus(capacityRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setLoading(false);
    }
  };

  const fetchShifts = async (targetTeamId: string) => {
    try {
      const response = await axios.get(`${API_URL}/teams/${targetTeamId}/shifts`);
      setShifts(response.data);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const updateResourceAllocation = async (resourceTeamId: string, updates: Partial<TeamResource>) => {
    try {
      await axios.patch(`${API_URL}/teams/${resourceTeamId}/resources`, updates);
      toast.success('Resources updated');
      await fetchResources();
    } catch (error) {
      console.error('Error updating resources:', error);
      toast.error('Failed to update resources');
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'overloaded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFatigueLabel = (level: number) => {
    if (level >= 80) return { label: 'Exhausted', color: 'text-red-600' };
    if (level >= 60) return { label: 'Tired', color: 'text-orange-600' };
    if (level >= 40) return { label: 'Moderate', color: 'text-yellow-600' };
    return { label: 'Fresh', color: 'text-green-600' };
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${ampm}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded"></div>)}
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall stats
  const totalStaff = resources.reduce((sum, r) => sum + r.totalStaff, 0);
  const availableStaff = resources.reduce((sum, r) => sum + r.availableStaff, 0);
  const avgUtilization = capacityStatus.length > 0
    ? Math.round(capacityStatus.reduce((sum, c) => sum + c.utilizationPercent, 0) / capacityStatus.length)
    : 0;
  const overloadedTeams = capacityStatus.filter(c => c.status === 'overloaded').length;

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">👥</span> Team Resources
          </h3>
          <span className="text-sm text-gray-500">
            {availableStaff}/{totalStaff} available
          </span>
        </div>

        {overloadedTeams > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
            <span className="text-red-700 text-sm font-semibold">
              ⚠️ {overloadedTeams} team(s) overloaded
            </span>
          </div>
        )}

        <div className="space-y-2">
          {capacityStatus.slice(0, 4).map(capacity => (
            <div key={capacity.teamId} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 truncate max-w-[120px]">{capacity.teamName}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getUtilizationColor(capacity.utilizationPercent)}`}
                    style={{ width: `${Math.min(capacity.utilizationPercent, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-8">{capacity.utilizationPercent}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2 border-t text-center">
          <span className="text-sm text-gray-500">
            Avg utilization: <span className={avgUtilization > 80 ? 'text-red-600 font-semibold' : ''}>{avgUtilization}%</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Resource Management</h2>
            <p className="text-sm text-gray-500">
              {availableStaff}/{totalStaff} staff available • {avgUtilization}% avg utilization
            </p>
          </div>
          {overloadedTeams > 0 && (
            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
              {overloadedTeams} overloaded
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Capacity Overview */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Team Capacity Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capacityStatus.map(capacity => {
              const resource = resources.find(r => r.teamId === capacity.teamId);
              const fatigue = resource ? getFatigueLabel(resource.fatigueLevel) : null;

              return (
                <div
                  key={capacity.teamId}
                  className={`p-4 rounded-lg border ${
                    capacity.status === 'overloaded' ? 'border-red-300 bg-red-50' :
                    capacity.status === 'busy' ? 'border-yellow-300 bg-yellow-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-800">{capacity.teamName}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(capacity.status)}`}>
                        {capacity.status}
                      </span>
                    </div>
                    {isInstructor && (
                      <button
                        onClick={() => {
                          setEditingTeamId(capacity.teamId);
                          fetchShifts(capacity.teamId);
                          setShowShiftEditor(true);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ⚙️
                      </button>
                    )}
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Utilization</span>
                      <span className="font-medium">{capacity.utilizationPercent}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getUtilizationColor(capacity.utilizationPercent)}`}
                        style={{ width: `${Math.min(capacity.utilizationPercent, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Incidents:</span>
                      <span className="ml-1 font-medium">{capacity.activeIncidents}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Changes:</span>
                      <span className="ml-1 font-medium">{capacity.activeChanges}</span>
                    </div>
                    {resource && (
                      <>
                        <div>
                          <span className="text-gray-500">Staff:</span>
                          <span className="ml-1 font-medium">{resource.availableStaff}/{resource.totalStaff}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Fatigue:</span>
                          <span className={`ml-1 font-medium ${fatigue?.color}`}>{fatigue?.label}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Resource View (Instructor) */}
        {isInstructor && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Detailed Resource Allocation</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Team</th>
                    <th className="text-center py-2 px-3">Total Staff</th>
                    <th className="text-center py-2 px-3">Available</th>
                    <th className="text-center py-2 px-3">Skill Level</th>
                    <th className="text-center py-2 px-3">Max Concurrent</th>
                    <th className="text-center py-2 px-3">Workload</th>
                    <th className="text-center py-2 px-3">Fatigue</th>
                    <th className="text-center py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(resource => {
                    const fatigue = getFatigueLabel(resource.fatigueLevel);
                    return (
                      <tr key={resource.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{resource.teamName}</td>
                        <td className="text-center py-2 px-3">{resource.totalStaff}</td>
                        <td className="text-center py-2 px-3">{resource.availableStaff}</td>
                        <td className="text-center py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={`text-xs ${i < resource.skillLevel ? 'text-yellow-500' : 'text-gray-300'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-center py-2 px-3">{resource.maxConcurrentIncidents}</td>
                        <td className="text-center py-2 px-3">
                          <div className="w-16 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getUtilizationColor(resource.currentWorkload)}`}
                              style={{ width: `${resource.currentWorkload}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="text-center py-2 px-3">
                          <span className={fatigue.color}>{fatigue.label}</span>
                        </td>
                        <td className="text-center py-2 px-3">
                          <button
                            onClick={() => {
                              const newStaff = prompt('Enter new total staff count:', String(resource.totalStaff));
                              if (newStaff) {
                                updateResourceAllocation(resource.teamId, { totalStaff: parseInt(newStaff) });
                              }
                            }}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shift Editor Modal */}
        {showShiftEditor && editingTeamId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">
                  Shift Schedule - {resources.find(r => r.teamId === editingTeamId)?.teamName}
                </h3>
                <button
                  onClick={() => {
                    setShowShiftEditor(false);
                    setEditingTeamId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                {shifts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No shifts configured</p>
                ) : (
                  <div className="space-y-3">
                    {shifts.map(shift => (
                      <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{shift.shiftName}</div>
                          <div className="text-sm text-gray-500">
                            {formatHour(shift.startHour)} - {formatHour(shift.endHour)} • {shift.staffCount} staff
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          shift.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {shift.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowShiftEditor(false);
                    setEditingTeamId(null);
                  }}
                  className="w-full bg-hawk-purple hover:bg-purple-800 text-white py-2 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
