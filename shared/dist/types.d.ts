export interface Team {
    id: string;
    name: string;
    code: string;
    adminPin?: string;
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
    date: string;
    attendance: string[];
    schedule?: Schedule;
    createdAt: string;
    updatedAt: string;
}
export interface Schedule {
    periods: Period[];
}
export interface Period {
    period: number;
    players: string[];
}
export interface DynamoItem {
    PK: string;
    SK: string;
    GSI1PK?: string;
    GSI1SK?: string;
    entityType: 'TEAM' | 'PLAYER' | 'COACH' | 'GAME';
    data: Team | Player | Coach | Game;
    ttl?: number;
}
//# sourceMappingURL=types.d.ts.map