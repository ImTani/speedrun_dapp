/** Shape of GET /api/stats (app/api/stats/route.ts), read by the landing page. */
export type ChainStats = {
	/** Distinct transactions behind the indexed Arena events: every game action, gas-sponsored. */
	transactions: number;
	/** Committed + Revealed events. */
	moves: number;
	/** BoutClosed events. */
	gatherings: number;
	/** Fragments whose binding is confirmed on-chain. */
	fragments: number;
};

/** Fuji (43113) and, once the Conclave runs, mainnet (43114). A chain appears once it has any. */
export type Stats = { chains: Partial<Record<"43113" | "43114", ChainStats>> };
