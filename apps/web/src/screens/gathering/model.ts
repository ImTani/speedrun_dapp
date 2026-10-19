// Pure reading of the Gathering's rites: who stands in each window, what each duel meant, the feed.
// Every word comes from the lexicon.
import { L } from "@/lexicon";
import { gathering as T } from "@/lexicon/gathering.ts";
import type {
	GatheringEvent,
	GatheringResponse,
	Participant,
	StandingsRow,
} from "./types.ts";

export type Kind = "devour" | "kindle" | "ruin";
export type SideKey = "A" | "B";

export interface Who {
	agent: string;
	name: string;
	aspect: number;
	mine: boolean;
}

export interface DuelSide extends Who {
	/** 0 = Kindle, 1 = Devour */
	move: 0 | 1;
	/** Light won in this duel. */
	gain: number;
	/** Light held in this Gathering before the duel. */
	lit: number;
}

export interface Duel {
	key: string;
	/** Toll of the bell (1-based). */
	toll: number;
	a: DuelSide;
	b: DuelSide;
	kind: Kind;
	/** The side that devoured, when exactly one did. */
	dev: SideKey | null;
	/** A mask stayed silent (forfeit). */
	silent: boolean;
	verdict: string;
	sub: string;
	/** Spoken with the verdict: who took what. */
	gains: string;
}

export interface FeedItem {
	k: string;
	text: string;
	tone: "bone" | "blood" | "gilt";
	mine: boolean;
}

export const num = (v: unknown) => Number(v ?? 0) || 0;
export const low = (s: unknown) => String(s ?? "").toLowerCase();
export const evKey = (e: GatheringEvent) => `${e.block}:${e.logIndex}:${e.tx}`;
export const aspectName = (i: number) => T.aspects[i] ?? T.aspects[0];
/** The Aspect's mask as a one-colour glyph (CSS mask-image), for engraved rubrics and seals. */
export const aspectGlyph = (i: number) =>
	`url(/masks/${(L.aspects[i] ?? L.aspects[0]).key}-ink.svg)`;

export function fmtClock(sec: number) {
	const s = Math.max(0, Math.floor(sec));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Name, Aspect and ownership of any agent seen in the Gathering or the Ledger. */
export function makeLookup(
	data: GatheringResponse | null,
	rows: StandingsRow[] | undefined,
	mine: string | null,
) {
	const m = new Map<string, Participant>();
	for (const p of data?.gathering?.participants ?? []) m.set(low(p.agent), p);
	for (const r of rows ?? []) if (!m.has(low(r.agent))) m.set(low(r.agent), r);
	return (agent: unknown): Who => {
		const p = m.get(low(agent));
		return {
			agent: low(agent),
			name: p?.name || T.nameless,
			aspect: p?.aspect ?? 0,
			mine: !!mine && low(agent) === mine,
		};
	};
}

/** Light each Fragment held in this Gathering before the given duel (for the tallies). */
export function priorLight(events: GatheringEvent[], before: GatheringEvent) {
	const m = new Map<string, number>();
	for (const e of events) {
		if (e.name !== "PairScored") continue;
		if (
			e.block > before.block ||
			(e.block === before.block && e.logIndex >= before.logIndex)
		)
			break;
		const a = low(e.data.agentA),
			b = low(e.data.agentB);
		m.set(a, (m.get(a) ?? 0) + num(e.data.pointsA));
		m.set(b, (m.get(b) ?? 0) + num(e.data.pointsB));
	}
	return m;
}

/** Light each Fragment holds in this Gathering after every duel so far. */
export function heldLight(events: GatheringEvent[]) {
	const m = new Map<string, number>();
	for (const e of events) {
		if (e.name !== "PairScored") continue;
		const a = low(e.data.agentA),
			b = low(e.data.agentB);
		m.set(a, (m.get(a) ?? 0) + num(e.data.pointsA));
		m.set(b, (m.get(b) ?? 0) + num(e.data.pointsB));
	}
	return m;
}

export function describeDuel(
	e: GatheringEvent,
	events: GatheringEvent[],
	who: (agent: unknown) => Who,
): Duel {
	const d = e.data;
	const prior = priorLight(events, e);
	const side = (agent: unknown, move: unknown, gain: unknown): DuelSide => {
		const w = who(agent);
		return {
			...w,
			move: num(move) === 1 ? 1 : 0,
			gain: Math.max(0, num(gain)),
			lit: prior.get(w.agent) ?? 0,
		};
	};
	const a = side(d.agentA, d.moveA, d.pointsA);
	const b = side(d.agentB, d.moveB, d.pointsB);
	const kind: Kind =
		a.move === 0 && b.move === 0
			? "kindle"
			: a.move === 1 && b.move === 1
				? "ruin"
				: "devour";
	const dev: SideKey | null =
		kind === "devour" ? (a.move === 1 ? "A" : "B") : null;
	const silent = d.forfeit === true || d.forfeit === "true";
	let verdict: string, sub: string;
	if (silent) {
		verdict = T.verdict.silence;
		sub = T.verdictSub.silence;
	} else if (kind === "kindle") {
		verdict = T.verdict.bothKindle;
		sub = T.verdictSub.kindle;
	} else if (kind === "ruin") {
		verdict = T.verdict.bothDevour;
		sub = T.verdictSub.ruin;
	} else {
		const [x, y] = dev === "A" ? [a, b] : [b, a];
		verdict = T.verdict.devours(x.name, y.name);
		sub = T.verdictSub.devour(y.name);
	}
	return {
		key: evKey(e),
		toll: num(e.round) + 1,
		a,
		b,
		kind,
		dev,
		silent,
		verdict,
		sub,
		gains: `${T.gained(a.name, a.gain)} ${T.gained(b.name, b.gain)}`,
	};
}

/**
 * The same pair, recast as a duel of the given kind (for replaying the verdict while tuning its
 * look): a devouring A, or both kindling. Returned as is when it already is that kind.
 */
export function recastDuel(d: Duel, kind: "devour" | "kindle"): Duel {
	if (d.kind === kind && !d.silent) return d;
	if (kind === "kindle")
		return {
			...d,
			kind,
			dev: null,
			silent: false,
			a: { ...d.a, move: 0 },
			b: { ...d.b, move: 0 },
			verdict: T.verdict.bothKindle,
			sub: T.verdictSub.kindle,
		};
	return {
		...d,
		kind,
		dev: "A",
		silent: false,
		a: { ...d.a, move: 1 },
		b: { ...d.b, move: 0 },
		verdict: T.verdict.devours(d.a.name, d.b.name),
		sub: T.verdictSub.devour(d.b.name),
	};
}

export function feedOf(
	events: GatheringEvent[],
	who: (agent: unknown) => Who,
	limit = 4,
): FeedItem[] {
	const out: FeedItem[] = [];
	// Seals come in a flurry: gather each run into one line (the Claimant's own stands apart).
	let seals: { k: string; who: Who }[] = [];
	const flush = () => {
		const own = seals.filter((x) => x.who.mine);
		const rest = seals.filter((x) => !x.who.mine);
		const last = rest[rest.length - 1];
		if (last)
			out.push({
				k: last.k,
				text:
					rest.length === 1
						? T.sealed(last.who.name)
						: T.sealedMany(rest.length),
				tone: "bone",
				mine: false,
			});
		for (const x of own)
			out.push({
				k: x.k,
				text: T.sealed(x.who.name),
				tone: "bone",
				mine: true,
			});
		seals = [];
	};
	for (const e of events) {
		const k = evKey(e);
		if (e.name === "Committed") {
			seals.push({ k, who: who(e.agent) });
			continue;
		}
		if (seals.length && e.name !== "Revealed") flush();
		switch (e.name) {
			case "BoutOpened":
				out.push({ k, text: T.opened, tone: "gilt", mine: false });
				break;
			case "RoundStarted":
				out.push({
					k,
					text: T.tolled(num(e.round) + 1),
					tone: "bone",
					mine: false,
				});
				break;
			case "PairScored": {
				const ma = num(e.data.moveA),
					mb = num(e.data.moveB);
				const a = who(e.data.agentA),
					b = who(e.data.agentB);
				const text =
					ma === 0 && mb === 0
						? T.pairKindle(a.name, b.name)
						: ma === 1 && mb === 1
							? T.pairRuin(a.name, b.name)
							: ma === 1
								? T.pairDevour(a.name, b.name)
								: T.pairDevour(b.name, a.name);
				out.push({
					k,
					text,
					tone: ma === 0 && mb === 0 ? "gilt" : "blood",
					mine: a.mine || b.mine,
				});
				break;
			}
			case "BoutClosed":
				out.push({ k, text: T.closed, tone: "gilt", mine: false });
				break;
		}
	}
	flush();
	return out.slice(-limit).reverse();
}
