import { useState, useEffect } from 'react';

interface SLATimerProps {
  deadline: string;
  compact?: boolean;
  onBreach?: () => void;
}

interface TimeRemaining {
  total: number;
  hours: number;
  minutes: number;
  seconds: number;
  isBreached: boolean;
  urgencyLevel: 'normal' | 'warning' | 'critical' | 'breached';
}

export default function SLATimer({ deadline, compact = false, onBreach }: SLATimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => calculateTimeRemaining(deadline));
  const [hasNotifiedBreach, setHasNotifiedBreach] = useState(false);

  function calculateTimeRemaining(deadlineStr: string): TimeRemaining {
    const now = new Date();
    const deadlineDate = new Date(deadlineStr);
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return {
        total: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isBreached: true,
        urgencyLevel: 'breached'
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Determine urgency level
    let urgencyLevel: 'normal' | 'warning' | 'critical' | 'breached' = 'normal';
    const totalMinutes = totalSeconds / 60;

    if (totalMinutes <= 5) {
      urgencyLevel = 'critical';
    } else if (totalMinutes <= 15) {
      urgencyLevel = 'warning';
    }

    return {
      total: totalSeconds,
      hours,
      minutes,
      seconds,
      isBreached: false,
      urgencyLevel
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(deadline);
      setTimeRemaining(remaining);

      // Trigger breach callback once
      if (remaining.isBreached && !hasNotifiedBreach && onBreach) {
        setHasNotifiedBreach(true);
        onBreach();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, hasNotifiedBreach, onBreach]);

  // Reset breach notification if deadline changes
  useEffect(() => {
    setHasNotifiedBreach(false);
  }, [deadline]);

  const getTimerStyles = () => {
    const baseStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: compact ? '4px 8px' : '8px 12px',
      borderRadius: '6px',
      fontWeight: '600' as const,
      fontSize: compact ? '12px' : '14px',
      fontFamily: 'monospace',
      transition: 'all 0.3s ease'
    };

    switch (timeRemaining.urgencyLevel) {
      case 'breached':
        return {
          ...baseStyles,
          backgroundColor: '#dc2626',
          color: '#ffffff',
          animation: 'pulse 1s infinite'
        };
      case 'critical':
        return {
          ...baseStyles,
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          border: '2px solid #dc2626',
          animation: 'pulse 1.5s infinite'
        };
      case 'warning':
        return {
          ...baseStyles,
          backgroundColor: '#fef3c7',
          color: '#d97706',
          border: '2px solid #f59e0b'
        };
      default:
        return {
          ...baseStyles,
          backgroundColor: '#dcfce7',
          color: '#16a34a',
          border: '1px solid #22c55e'
        };
    }
  };

  const formatTime = () => {
    if (timeRemaining.isBreached) {
      return 'SLA BREACHED';
    }

    const { hours, minutes, seconds } = timeRemaining;

    if (compact) {
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m ${seconds}s`;
    }

    // Full format with leading zeros
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const getIcon = () => {
    if (timeRemaining.isBreached) {
      return '🚨';
    }
    if (timeRemaining.urgencyLevel === 'critical') {
      return '⚠️';
    }
    if (timeRemaining.urgencyLevel === 'warning') {
      return '⏰';
    }
    return '✓';
  };

  return (
    <div style={getTimerStyles()}>
      <span>{getIcon()}</span>
      <span>{formatTime()}</span>
    </div>
  );
}

// CSS for pulse animation - add to App.css or include inline
export const slaTimerStyles = `
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}
`;
