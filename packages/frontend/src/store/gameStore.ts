import { create } from 'zustand';

interface Player {
  id: string;
  name: string;
  teamId: string;
  role: string;
  isReady: boolean;
}

interface Team {
  id: string;
  name: string;
  role: 'Service Desk' | 'Technical Operations' | 'Management/CAB';
  members: Player[];
  score: number;
}

interface GameState {
  gameId: string | null;
  status: 'lobby' | 'active' | 'paused' | 'completed';
  teams: Team[];
  currentPlayer: Player | null;
  timeRemaining: number; // in seconds
  startedAt: string | null;
}

interface GameStore extends GameState {
  setGameId: (gameId: string) => void;
  setStatus: (status: GameState['status']) => void;
  setTeams: (teams: Team[]) => void;
  setCurrentPlayer: (player: Player) => void;
  setTimeRemaining: (time: number) => void;
  addTeam: (team: Team) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  addPlayerToTeam: (teamId: string, player: Player) => void;
  removePlayerFromTeam: (teamId: string, playerId: string) => void;
  reset: () => void;
}

const initialState: GameState = {
  gameId: null,
  status: 'lobby',
  teams: [],
  currentPlayer: null,
  timeRemaining: 75 * 60, // 75 minutes in seconds
  startedAt: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setGameId: (gameId) => set({ gameId }),
  setStatus: (status) => set({ status }),
  setTeams: (teams) => set({ teams }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),

  addTeam: (team) => set((state) => ({
    teams: [...state.teams, team],
  })),

  updateTeam: (teamId, updates) => set((state) => ({
    teams: state.teams.map((team) =>
      team.id === teamId ? { ...team, ...updates } : team
    ),
  })),

  addPlayerToTeam: (teamId, player) => set((state) => ({
    teams: state.teams.map((team) =>
      team.id === teamId
        ? { ...team, members: [...team.members, player] }
        : team
    ),
  })),

  removePlayerFromTeam: (teamId, playerId) => set((state) => ({
    teams: state.teams.map((team) =>
      team.id === teamId
        ? { ...team, members: team.members.filter((p) => p.id !== playerId) }
        : team
    ),
  })),

  reset: () => set(initialState),
}));
