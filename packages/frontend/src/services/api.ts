import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export interface CreateGameRequest {
  gameName: string;
  facilitatorName: string;
  durationMinutes: number;
  teams: Array<{ name: string; role: string; }>;
}

export interface GameResponse {
  game: { id: string; name: string; status: string; durationMinutes: number; createdAt: string; };
  teams: Array<{ id: string; name: string; role: string; score: number; }>;
  facilitator: string;
}

export interface Game {
  id: string;
  name: string;
  status: string;
  playerCount: number;
  teamCount: number;
  durationMinutes: number;
  createdAt: string;
}

export interface JoinGameRequest {
  playerName: string;
  teamId?: string;
}

export interface PlayerResponse {
  player: { id: string; name: string; teamId: string | null; gameId: string; isReady: boolean; };
}

export const gameApi = {
  async createGame(data: CreateGameRequest): Promise<GameResponse> {
    const response = await api.post<GameResponse>('/games', data);
    return response.data;
  },
  async getGame(gameId: string): Promise<GameResponse> {
    const response = await api.get<GameResponse>(`/games/${gameId}`);
    return response.data;
  },
  async listGames(): Promise<{ games: Game[] }> {
    const response = await api.get<{ games: Game[] }>('/games');
    return response.data;
  },
  async joinGame(gameId: string, data: JoinGameRequest): Promise<PlayerResponse> {
    const response = await api.post<PlayerResponse>(`/games/${gameId}/join`, data);
    return response.data;
  },
};

export default api;

