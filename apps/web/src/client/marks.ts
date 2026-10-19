// Marks client: the shelf, plain labels for each tier, and "new since last look" tracking.
import type { MarksResponse, MarkTierView, MarkView } from "@/game/marks.ts";
import { marks as M } from "@/lexicon/marks.ts";
import type { Api } from "./api.ts";

export type {
	MarkKey,
	MarkProgress,
	MarkState,
	MarksResponse,
	MarkTierView,
	MarkView,
} from "@/game/marks.ts";

/** GET /api/marks. The server queues anything newly reached before answering. */
export const fetchMarks = (api: Api): Promise<MarksResponse> =>
	api.call<MarksResponse>("/api/marks");

/** Display name of one tier, e.g. "Devourer II", "Sixth Degree". */
export function tierName(mark: MarkView, tier: MarkTierView): string {
	return M.kinds[mark.key].tierName(tier.tier);
}

/** How the tier is earned, e.g. "Devour 50 times." */
export function tierHow(mark: MarkView, tier: MarkTierView): string {
	const k = M.kinds[mark.key];
	return k.how(mark.key === "degree" ? tier.tier : tier.need);
}

/** "12 / 50" toward a locked tier; null when progress isn't a count (Degree, Stigmata). */
export function tierProgress(
	mark: MarkView,
	tier: MarkTierView,
): string | null {
	if (tier.state !== "locked" || mark.key === "degree" || mark.unique)
		return null;
	return M.progress(mark.have, tier.need);
}

/** The highest tier the player holds (earned or sealed), or null. */
export function bestTier(mark: MarkView): MarkTierView | null {
	let best: MarkTierView | null = null;
	for (const t of mark.tiers)
		if (t.state === "earned" || t.state === "sealed") best = t;
	return best;
}

/** Fuji block explorer link for a sealed Mark. */
export const sealUrl = (tx: string) => `https://testnet.snowtrace.io/tx/${tx}`;

/** Tiered Marks first, then Stigmata. */
export function splitShelf(res: MarksResponse) {
	return {
		marks: res.marks.filter((m) => !m.unique),
		stigmata: res.marks.filter((m) => m.unique),
	};
}

const SEEN_KEY = "apostasy.marks.seen";
const tierKey = (m: MarkView, t: MarkTierView) => `${m.kind}:${t.tier}`;

function readSeen(): Set<string> {
	try {
		const raw = localStorage.getItem(SEEN_KEY);
		return new Set(raw ? (JSON.parse(raw) as string[]) : []);
	} catch {
		return new Set();
	}
}

/** Earned or sealed tiers the player hasn't been shown yet (for the unlock moment). */
export function unseenMarks(
	res: MarksResponse,
): { mark: MarkView; tier: MarkTierView }[] {
	const seen = readSeen();
	const out: { mark: MarkView; tier: MarkTierView }[] = [];
	for (const m of res.marks)
		for (const t of m.tiers)
			if (
				(t.state === "earned" || t.state === "sealed") &&
				!seen.has(tierKey(m, t))
			)
				out.push({ mark: m, tier: t });
	return out;
}

/** Remember these tiers as shown. */
export function markSeen(items: { mark: MarkView; tier: MarkTierView }[]) {
	if (!items.length) return;
	const seen = readSeen();
	for (const i of items) seen.add(tierKey(i.mark, i.tier));
	try {
		localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
	} catch {
		// Private mode: the moment just plays again next time.
	}
}
