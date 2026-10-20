/** Shape of GET /api/stats (app/api/stats/route.ts), read by the landing page. */
export type ChainStats = {
	/** Committed + Revealed events: every one a gas-sponsored transaction. */
	moves: number;
	/** BoutClosed events. */
	gatherings: number;
	/** Fragments whose binding is confirmed on-chain. */
	fragments: number;
};

/** Fuji (43113) and, once the Conclave runs, mainnet (43114). A chain appears once it has any. */
export type Stats = { chains: Partial<Record<"43113" | "43114", ChainStats>> };
