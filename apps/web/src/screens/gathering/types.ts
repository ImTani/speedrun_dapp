export interface GatheringEvent {
	block: number;
	logIndex: number;
	tx: string;
	name: string;
	gathering: string | null;
	round: number | null;
	agent: string | null;
	data: Record<string, unknown>;
}

export interface Participant {
	agent: string;
	name: string;
	aspect: number;
}

export interface GatheringResponse {
	active: boolean;
	gathering: null | {
		id: string;
		round: number;
		rounds: number;
		movesPerMatch: number;
		phase: "commit" | "reveal" | "between";
		commitDeadline: number;
		revealDeadline: number;
		participants: Participant[];
	};
	events: GatheringEvent[];
}

export interface StandingsRow {
	agent: string;
	name: string;
	aspect: number;
	light: number;
	duels: number;
}

export interface StandingsResponse {
	rows: StandingsRow[];
}
