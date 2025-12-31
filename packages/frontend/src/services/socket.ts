import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  connect(sessionId: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { sessionId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Game events
  joinGame(gameId: string, teamId: string, userId: string) {
    this.socket?.emit('game:join', { gameId, teamId, userId });
  }

  leaveGame(gameId: string, teamId: string, userId: string) {
    this.socket?.emit('game:leave', { gameId, teamId, userId });
  }

  submitAction(gameId: string, action: any) {
    this.socket?.emit('game:action', { gameId, action });
  }

  requestGameState(gameId: string) {
    this.socket?.emit('game:requestState', { gameId });
  }

  // Chat events
  sendMessage(gameId: string, teamId: string, message: string, userId: string, userName: string) {
    this.socket?.emit('chat:send', { gameId, teamId, message, userId, userName });
  }

  sendTypingIndicator(teamId: string, userId: string, userName: string, isTyping: boolean) {
    this.socket?.emit('chat:typing', { teamId, userId, userName, isTyping });
  }

  // Team events
  sendTeamMessage(teamId: string, message: string, userId: string) {
    this.socket?.emit('team:message', { teamId, message, userId });
  }

  coordinateTeamAction(teamId: string, action: any, userId: string) {
    this.socket?.emit('team:coordinateAction', { teamId, action, userId });
  }

  // Event listeners
  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
