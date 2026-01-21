import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

interface ServiceNode {
  id: string;
  name: string;
  status: string;
  criticality: number;
  dependsOn: string[];
  dependedOnBy: string[];
}

interface DependencyEdge {
  from: string;
  to: string;
  type: 'hard' | 'soft';
}

interface DependencyGraph {
  services: ServiceNode[];
  edges: DependencyEdge[];
}

interface CascadeImpact {
  serviceId: string;
  serviceName: string;
  currentStatus: string;
  impactedStatus: string;
  impactType: 'direct' | 'cascade';
}

interface ServiceDependencyGraphProps {
  gameId: string;
  compact?: boolean;
}

export default function ServiceDependencyGraph({ gameId, compact = false }: ServiceDependencyGraphProps) {
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [cascadeImpact, setCascadeImpact] = useState<CascadeImpact[]>([]);
  const [showImpactSimulation, setShowImpactSimulation] = useState(false);

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 30000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchGraph = async () => {
    try {
      const response = await axios.get(`${API_URL}/games/${gameId}/dependencies/graph`);
      setGraph(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dependency graph:', error);
      setLoading(false);
    }
  };

  const simulateCascade = useCallback(async (serviceId: string) => {
    try {
      const response = await axios.get(`${API_URL}/services/${serviceId}/cascade-impact`);
      setCascadeImpact(response.data);
      setShowImpactSimulation(true);
    } catch (error) {
      console.error('Error simulating cascade:', error);
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'operational': return 'border-green-500';
      case 'degraded': return 'border-yellow-500';
      case 'down': return 'border-red-500';
      default: return 'border-gray-500';
    }
  };

  const getCriticalityLabel = (criticality: number) => {
    if (criticality >= 9) return 'Critical';
    if (criticality >= 7) return 'High';
    if (criticality >= 5) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-500">Unable to load dependency graph</p>
      </div>
    );
  }

  // Calculate service positions for visualization
  const serviceMap = new Map(graph.services.map(s => [s.id, s]));

  // Group services by their dependency depth (simple topological sort approximation)
  const getServiceDepth = (serviceId: string, visited: Set<string> = new Set()): number => {
    if (visited.has(serviceId)) return 0;
    visited.add(serviceId);
    const service = serviceMap.get(serviceId);
    if (!service || service.dependsOn.length === 0) return 0;
    return 1 + Math.max(...service.dependsOn.map(dep => getServiceDepth(dep, visited)));
  };

  const servicesByDepth: Map<number, ServiceNode[]> = new Map();
  graph.services.forEach(service => {
    const depth = getServiceDepth(service.id);
    if (!servicesByDepth.has(depth)) servicesByDepth.set(depth, []);
    servicesByDepth.get(depth)!.push(service);
  });

  const maxDepth = Math.max(...Array.from(servicesByDepth.keys()), 0);

  // Count services by status
  const statusCounts = graph.services.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">🔗</span> Service Dependencies
          </h3>
          <span className="text-sm text-gray-500">
            {graph.services.length} services • {graph.edges.length} dependencies
          </span>
        </div>

        <div className="flex gap-4 mb-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm">{statusCounts['operational'] || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm">{statusCounts['degraded'] || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm">{statusCounts['down'] || 0}</span>
          </div>
        </div>

        {/* Mini graph representation */}
        <div className="flex flex-wrap gap-2">
          {graph.services.slice(0, 8).map(service => (
            <div
              key={service.id}
              className={`px-2 py-1 rounded text-xs border-2 ${getStatusBorderColor(service.status)} bg-white`}
              title={`${service.name}: ${service.status}`}
            >
              {service.name.substring(0, 12)}
              {service.name.length > 12 && '...'}
            </div>
          ))}
          {graph.services.length > 8 && (
            <span className="text-xs text-gray-500 self-center">
              +{graph.services.length - 8} more
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Service Dependency Map</h2>
            <p className="text-sm text-gray-500">
              {graph.services.length} services • {graph.edges.length} dependencies
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Operational ({statusCounts['operational'] || 0})</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Degraded ({statusCounts['degraded'] || 0})</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Down ({statusCounts['down'] || 0})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Layered visualization */}
        <div className="space-y-6">
          {Array.from(servicesByDepth.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([depth, services]) => (
              <div key={depth} className="relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-gray-400 w-16">
                  Layer {maxDepth - depth}
                </div>
                <div className="ml-20 flex flex-wrap gap-4">
                  {services.map(service => {
                    const isSelected = selectedService === service.id;
                    const isImpacted = cascadeImpact.some(i => i.serviceId === service.id);
                    const impactInfo = cascadeImpact.find(i => i.serviceId === service.id);

                    return (
                      <div
                        key={service.id}
                        onClick={() => {
                          setSelectedService(isSelected ? null : service.id);
                          if (!isSelected) {
                            simulateCascade(service.id);
                          } else {
                            setCascadeImpact([]);
                            setShowImpactSimulation(false);
                          }
                        }}
                        className={`
                          relative p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${getStatusBorderColor(service.status)}
                          ${isSelected ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'}
                          ${isImpacted && showImpactSimulation ? 'animate-pulse' : ''}
                        `}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                          <span className="font-semibold text-gray-800">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={`px-1.5 py-0.5 rounded ${
                            service.criticality >= 9 ? 'bg-red-100 text-red-700' :
                            service.criticality >= 7 ? 'bg-orange-100 text-orange-700' :
                            service.criticality >= 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {getCriticalityLabel(service.criticality)}
                          </span>
                          {service.dependsOn.length > 0 && (
                            <span>↓ {service.dependsOn.length}</span>
                          )}
                          {service.dependedOnBy.length > 0 && (
                            <span>↑ {service.dependedOnBy.length}</span>
                          )}
                        </div>

                        {isImpacted && showImpactSimulation && impactInfo && (
                          <div className={`absolute -bottom-6 left-0 right-0 text-center text-xs ${
                            impactInfo.impactType === 'direct' ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            → {impactInfo.impactedStatus} ({impactInfo.impactType})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-lg">↓</span>
            <span>Depends on</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">↑</span>
            <span>Depended on by</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-400"></div>
            <span>Hard dependency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-400 border-dashed border-t-2 border-gray-400"></div>
            <span>Soft dependency</span>
          </div>
        </div>
      </div>

      {/* Selected Service Details */}
      {selectedService && (
        <div className="p-4 border-t bg-gray-50">
          {(() => {
            const service = serviceMap.get(selectedService);
            if (!service) return null;

            return (
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  Impact Analysis: {service.name}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Depends On ({service.dependsOn.length})</h4>
                    {service.dependsOn.length === 0 ? (
                      <p className="text-sm text-gray-500">No dependencies</p>
                    ) : (
                      <div className="space-y-1">
                        {service.dependsOn.map(depId => {
                          const dep = serviceMap.get(depId);
                          const edge = graph.edges.find(e => e.from === service.id && e.to === depId);
                          return dep ? (
                            <div key={depId} className="flex items-center gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(dep.status)}`}></div>
                              <span>{dep.name}</span>
                              <span className={`text-xs px-1 rounded ${
                                edge?.type === 'hard' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                              }`}>
                                {edge?.type || 'hard'}
                              </span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Cascade Impact ({cascadeImpact.length} services)
                    </h4>
                    {cascadeImpact.length === 0 ? (
                      <p className="text-sm text-gray-500">No downstream impact</p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {cascadeImpact.map(impact => (
                          <div key={impact.serviceId} className="flex items-center gap-2 text-sm">
                            <span className={impact.impactType === 'direct' ? 'text-red-600' : 'text-orange-600'}>
                              {impact.impactType === 'direct' ? '●' : '○'}
                            </span>
                            <span>{impact.serviceName}</span>
                            <span className="text-gray-400">→</span>
                            <span className={`px-1 rounded text-xs ${
                              impact.impactedStatus === 'down' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                            }`}>
                              {impact.impactedStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
