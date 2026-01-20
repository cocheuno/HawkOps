import { useState, useEffect } from 'react';

interface Service {
  id: string;
  name: string;
  type: string;
  status: 'operational' | 'degraded' | 'down';
  criticality: number;
  description?: string;
  activeIncidents: number;
}

interface ServiceHealthProps {
  services: Service[];
  compact?: boolean;
  onServiceClick?: (service: Service) => void;
}

interface HealthSummary {
  total: number;
  operational: number;
  degraded: number;
  down: number;
  healthScore: number;
}

export default function ServiceHealthDashboard({ services, compact = false, onServiceClick }: ServiceHealthProps) {
  const [summary, setSummary] = useState<HealthSummary>({
    total: 0,
    operational: 0,
    degraded: 0,
    down: 0,
    healthScore: 100,
  });

  useEffect(() => {
    const operational = services.filter(s => s.status === 'operational').length;
    const degraded = services.filter(s => s.status === 'degraded').length;
    const down = services.filter(s => s.status === 'down').length;
    const total = services.length;

    // Calculate health score (weighted by criticality)
    let totalCriticality = 0;
    let healthyWeight = 0;

    services.forEach(service => {
      totalCriticality += service.criticality;
      if (service.status === 'operational') {
        healthyWeight += service.criticality;
      } else if (service.status === 'degraded') {
        healthyWeight += service.criticality * 0.5;
      }
      // 'down' contributes 0
    });

    const healthScore = totalCriticality > 0
      ? Math.round((healthyWeight / totalCriticality) * 100)
      : 100;

    setSummary({ total, operational, degraded, down, healthScore });
  }, [services]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return { bg: '#dcfce7', border: '#22c55e', text: '#16a34a', icon: '✓' };
      case 'degraded': return { bg: '#fef3c7', border: '#f59e0b', text: '#d97706', icon: '⚠' };
      case 'down': return { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', icon: '✕' };
      default: return { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280', icon: '?' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'server': return '🖥️';
      case 'database': return '🗄️';
      case 'service': return '⚙️';
      case 'application': return '📱';
      case 'network': return '🌐';
      default: return '📦';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return '#16a34a';
    if (score >= 70) return '#d97706';
    return '#dc2626';
  };

  if (services.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}>
        <p>No services configured for this simulation</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          Services will appear here when the simulation includes infrastructure components
        </p>
      </div>
    );
  }

  if (compact) {
    // Compact view - just summary stats
    return (
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: getHealthScoreColor(summary.healthScore) }}>
            {summary.healthScore}%
          </span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Health</span>
        </div>
        <div style={{ width: '1px', height: '32px', backgroundColor: '#e5e7eb' }} />
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{summary.operational}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{summary.degraded}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{summary.down}</span>
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      {/* Header with Health Score */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            Service Health
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            {summary.total} services monitored
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: summary.healthScore >= 90 ? '#dcfce7' : summary.healthScore >= 70 ? '#fef3c7' : '#fef2f2',
          borderRadius: '8px',
        }}>
          <span style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: getHealthScoreColor(summary.healthScore),
          }}>
            {summary.healthScore}%
          </span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Overall<br/>Health</span>
        </div>
      </div>

      {/* Status Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        backgroundColor: '#e5e7eb',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{ padding: '12px 16px', backgroundColor: '#ffffff', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{summary.operational}</span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Operational</p>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#ffffff', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>{summary.degraded}</span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Degraded</p>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#ffffff', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{summary.down}</span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Down</p>
        </div>
      </div>

      {/* Services Grid */}
      <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
        }}>
          {services
            .sort((a, b) => {
              // Sort by status priority (down first, then degraded, then operational)
              const statusOrder = { down: 0, degraded: 1, operational: 2 };
              const statusDiff = statusOrder[a.status] - statusOrder[b.status];
              if (statusDiff !== 0) return statusDiff;
              // Then by criticality (higher first)
              return b.criticality - a.criticality;
            })
            .map((service) => {
              const colors = getStatusColor(service.status);
              return (
                <div
                  key={service.id}
                  onClick={() => onServiceClick?.(service)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${colors.border}`,
                    backgroundColor: colors.bg,
                    cursor: onServiceClick ? 'pointer' : 'default',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  className={service.status === 'down' ? 'service-status-down' : ''}
                  onMouseEnter={(e) => {
                    if (onServiceClick) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{getTypeIcon(service.type)}</span>
                      <div>
                        <h4 style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937',
                          lineHeight: '1.2',
                        }}>
                          {service.name}
                        </h4>
                        <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>
                          {service.type}
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: colors.text,
                    }}>
                      {colors.icon}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: `1px solid ${colors.border}`,
                  }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: colors.text,
                      textTransform: 'uppercase',
                    }}>
                      {service.status}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {service.activeIncidents > 0 && (
                        <span style={{
                          fontSize: '11px',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          padding: '2px 6px',
                          borderRadius: '10px',
                        }}>
                          {service.activeIncidents} incident{service.activeIncidents > 1 ? 's' : ''}
                        </span>
                      )}
                      <span style={{
                        fontSize: '10px',
                        color: '#6b7280',
                      }}>
                        Crit: {service.criticality}/10
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
