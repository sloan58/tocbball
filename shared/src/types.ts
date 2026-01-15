export interface Team {
  id: string;
  name: string;
  code: string; // Team access code (for viewing)
  adminPin?: string; // Admin PIN (for editing) - only returned on creation, not in GET requests
  createdAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber?: number;
  active: boolean;
  createdAt: string;
}

export interface Coach {
  id: string;
  teamId: string;
  name: string;
  email?: string;
  createdAt: string;
}

export interface Game {
  id: string;
  teamId: string;
  date: string; // ISO date string
  location: string;
  opponent: string;
  venue: 'home' | 'away';
  attendance: string[]; // player_ids present
  schedule?: Schedule;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  periods: Period[];
}

export interface Period {
  period: number; // 1-8
  players: string[]; // player_ids on the floor
}

// DynamoDB item structure (single-table design)
export interface DynamoItem {
  PK: string; // team_id
  SK: string; // entity_type#id (e.g., "TEAM#team_id", "PLAYER#player_id")
  GSI1PK?: string; // For team code lookup: TEAM_CODE#code
  GSI1SK?: string;
  entityType: 'TEAM' | 'PLAYER' | 'COACH' | 'GAME';
  data: Team | Player | Coach | Game;
  ttl?: number; // Optional for cleanup
}
