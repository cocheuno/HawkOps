import { useEffect } from 'react';
import { socketService } from '../services/socket';

export function useSocket(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    const socket = socketService.connect(sessionId);

    return () => {
      socketService.disconnect();
    };
  }, [sessionId]);

  return socketService;
}

export function useSocketEvent(event: string, callback: (...args: any[]) => void) {
  useEffect(() => {
    socketService.on(event, callback);

    return () => {
      socketService.off(event, callback);
    };
  }, [event, callback]);
}
