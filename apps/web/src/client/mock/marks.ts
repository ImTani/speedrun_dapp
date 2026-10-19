// Preview mock for Marks and push: a shelf with some Marks sealed, some earned and waiting, some
// locked, and the Stigma held by someone else. Import for its side effect.
import { type MarkProgress, marksView } from "@/game/marks.ts";
import { registerMockRoute } from "../mockRoutes.ts";

const tx = (n: number) => `0x${n.toString(16).padStart(4, "0").repeat(16)}`;

interface MockShelf {
	progress: MarkProgress;
	held: {
		kind: number;
		tier: number;
		status: "queued" | "minted";
		tx: string | null;
	}[];
	taken: { kind: number; tier: number }[];
}

/** Sixth Degree, 23 Gatherings, 64 Devours, 31 Kindles, 7 Spire floors. */
function fresh(): MockShelf {
	return {
		progress: { degree: 1, gatherings: 23, devours: 64, kindles: 31, spire: 7 },
		held: [
			{ kind: 1, tier: 6, status: "minted", tx: tx(0xa1) },
			{ kind: 2, tier: 1, status: "minted", tx: tx(0xa2) },
			{ kind: 3, tier: 1, status: "minted", tx: tx(0xa3) },
			{ kind: 3, tier: 2, status: "queued", tx: null },
			{ kind: 4, tier: 1, status: "minted", tx: tx(0xa4) },
			{ kind: 5, tier: 1, status: "queued", tx: null },
			{ kind: 6, tier: 1, status: "minted", tx: tx(0xa6) },
			{ kind: 6, tier: 2, status: "queued", tx: null },
		],
		taken: [{ kind: 100, tier: 0 }],
	};
}

let shelf = fresh();
const subscriptions = new Set<string>();

/** Restore the starting shelf; `empty` gives a new Claimant with nothing earned. */
export function resetMockMarks(opts: { empty?: boolean } = {}) {
	shelf = opts.empty
		? {
				progress: {
					degree: 0,
					gatherings: 0,
					devours: 0,
					kindles: 0,
					spire: 0,
				},
				held: [],
				taken: [],
			}
		: fresh();
}

/** Seal everything waiting (lets a preview show the earned -> sealed change). */
export function sealMockMarks() {
	shelf = {
		...shelf,
		held: shelf.held.map((h, i) =>
			h.status === "queued" ? { ...h, status: "minted", tx: tx(0xb0 + i) } : h,
		),
	};
}

registerMockRoute("/api/marks", () =>
	marksView(shelf.progress, shelf.held, shelf.taken),
);

registerMockRoute(
	"/api/push/subscribe",
	(_path, body) => {
		const endpoint = (body as { subscription?: { endpoint?: string } })
			?.subscription?.endpoint;
		if (endpoint) subscriptions.add(endpoint);
		return { ok: true };
	},
	"POST",
);

registerMockRoute(
	"/api/push/subscribe",
	(_path, body) => {
		const endpoint = (body as { endpoint?: string })?.endpoint;
		if (endpoint) subscriptions.delete(endpoint);
		return { ok: true };
	},
	"DELETE",
);
