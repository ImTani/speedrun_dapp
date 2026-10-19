"use client";

import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { gathering as T } from "@/lexicon/gathering.ts";
import type { Stage, StageDuel } from "@/scene/inkStage.js";
import { fixtureGathering, fixtureStandings } from "./fixture.ts";
import type {
	GatheringEvent,
	GatheringResponse,
	Participant,
	StandingsResponse,
} from "./types.ts";

const W = 390,
	H = 844;
const BONE = "#d8c6a0",
	BONE_D = "#a8916a",
	BLOOD_L = "#c7262c",
	GILT = "#e3c27c";
const SERIF: CSSProperties = {
	fontFamily: "Spectral, Georgia, serif",
	fontStyle: "italic",
	fontWeight: 500,
};
const GOTH: CSSProperties = {
	fontFamily: "'Grenze Gotisch', serif",
	fontWeight: 900,
};
const SHADOW = "0 0 3px #0b0807, 0 0 6px #0b0807, 0 1px 0 #0b0807";

type MaskFn = (aspect: string, width?: number) => string;
const ASPECT_KEYS = [
	"mercy",
	"hunger",
	"echo",
	"rancour",
	"appetite",
	"inquisitor",
	"madness",
];

const num = (v: unknown) => Number(v ?? 0) || 0;
const low = (s: unknown) => String(s ?? "").toLowerCase();
const evKey = (e: GatheringEvent) => `${e.block}:${e.logIndex}:${e.tx}`;

function fmtClock(sec: number) {
	const s = Math.max(0, Math.floor(sec));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

async function getJSON<R>(url: string): Promise<R | null> {
	try {
		const r = await fetch(url, { cache: "no-store" });
		if (!r.ok) return null;
		return (await r.json()) as R;
	} catch {
		return null;
	}
}

export function GatheringScreen() {
	const hostRef = useRef<HTMLDivElement>(null);
	const boxRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<Stage | null>(null);
	const [scale, setScale] = useState(1);
	const [data, setData] = useState<GatheringResponse | null>(null);
	const [vision, setVision] = useState(false);
	const [standings, setStandings] = useState<StandingsResponse | null>(null);
	const [ledgerOpen, setLedgerOpen] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [now, setNow] = useState(() => Date.now() / 1000);
	const [mask, setMask] = useState<MaskFn | null>(null);
	const [stageReady, setStageReady] = useState(false);

	// duel queue
	const seen = useRef(new Set<string>());
	const queue = useRef<GatheringEvent[]>([]);
	const busy = useRef(false);
	const first = useRef(true);
	const dataRef = useRef<GatheringResponse | null>(null);
	const fixtureCursor = useRef(0);

	// ---------- fit the 390 x 844 stage into the box ----------
	useEffect(() => {
		const el = boxRef.current;
		if (!el) return;
		const fit = () =>
			setScale(Math.min(el.clientWidth / W, el.clientHeight / H) || 1);
		fit();
		const ro = new ResizeObserver(fit);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// ---------- mount the stage (browser only) ----------
	useEffect(() => {
		let alive = true;
		let st: Stage | null = null;
		(async () => {
			const [{ mountStage }, { MASK }] = await Promise.all([
				import("@/scene/inkStage.js"),
				import("@/scene/masks.js"),
			]);
			if (!alive) return;
			setMask(() => MASK.mask as MaskFn);
			const host = hostRef.current;
			if (!host) return;
			st = await mountStage(host, { passLabel: T.pass });
			if (!alive) {
				st.destroy();
				return;
			}
			stageRef.current = st;
			setStageReady(true);
		})().catch((e) => console.error("[gathering] stage", e));
		return () => {
			alive = false;
			stageRef.current = null;
			st?.destroy();
		};
	}, []);

	// ---------- polling ----------
	const pollGathering = useCallback(async () => {
		const r = await getJSON<GatheringResponse>("/api/gathering");
		const d = r ?? fixtureGathering();
		setVision(!r);
		dataRef.current = d;
		setData(d);
		const scored = d.events.filter((e) => e.name === "PairScored");
		const fresh = scored.filter((e) => !seen.current.has(evKey(e)));
		for (const e of fresh) seen.current.add(evKey(e));
		if (first.current) {
			// open on the most recent duel rather than replaying history
			first.current = false;
			const lastDuel = fresh[fresh.length - 1];
			if (lastDuel) queue.current.push(lastDuel);
		} else if (r) {
			queue.current.push(...fresh);
		} else if (!busy.current && queue.current.length === 0 && scored.length) {
			// vision mode: keep the stage alive by replaying the fixture duels in turn
			queue.current.push(
				scored[fixtureCursor.current++ % scored.length] as GatheringEvent,
			);
		}
		if (queue.current.length > 8)
			queue.current.splice(0, queue.current.length - 8);
		pump();
	}, []);

	useEffect(() => {
		void pollGathering();
		const a = setInterval(() => void pollGathering(), 3000);
		const loadStandings = async () =>
			setStandings(
				(await getJSON<StandingsResponse>("/api/standings")) ??
					fixtureStandings(),
			);
		void loadStandings();
		const b = setInterval(() => void loadStandings(), 15000);
		const c = setInterval(() => setNow(Date.now() / 1000), 1000);
		return () => {
			clearInterval(a);
			clearInterval(b);
			clearInterval(c);
		};
	}, [pollGathering]);

	useEffect(() => {
		if (stageReady) pump();
	}, [stageReady]);

	// Before any duel has played, set the first two masked Fragments in the windows at rest.
	const posed = useRef(false);
	useEffect(() => {
		const st = stageRef.current;
		if (!st || posed.current || busy.current) return;
		const ps = data?.gathering?.participants ?? [];
		const [p, q] = [ps[0] ?? standings?.rows[0], ps[1] ?? standings?.rows[1]];
		if (!p || !q) return;
		posed.current = true;
		const side = (x: Participant) => ({
			name: x.name || T.nameless,
			aspect: x.aspect,
			sub: T.wears(T.aspects[x.aspect] ?? T.aspects[0]),
		});
		st.setPair(side(p), side(q));
	}, [stageReady, data, standings]);

	// ---------- name lookup ----------
	const people = useMemo(() => {
		const m = new Map<string, Participant>();
		for (const p of data?.gathering?.participants ?? []) m.set(low(p.agent), p);
		for (const r of standings?.rows ?? [])
			if (!m.has(low(r.agent))) m.set(low(r.agent), r);
		return m;
	}, [data, standings]);
	const peopleRef = useRef(people);
	peopleRef.current = people;
	const nameOf = (agent: unknown) =>
		peopleRef.current.get(low(agent))?.name || T.nameless;
	const aspectOf = (agent: unknown) =>
		peopleRef.current.get(low(agent))?.aspect ?? 0;

	// Light each Fragment held in this Gathering before the given duel (for the lit medallions).
	function priorLight(before: GatheringEvent) {
		const m = new Map<string, number>();
		for (const e of dataRef.current?.events ?? []) {
			if (e.name !== "PairScored") continue;
			if (
				e.block > before.block ||
				(e.block === before.block && e.logIndex >= before.logIndex)
			)
				break;
			m.set(
				low(e.data.agentA),
				(m.get(low(e.data.agentA)) ?? 0) + num(e.data.pointsA),
			);
			m.set(
				low(e.data.agentB),
				(m.get(low(e.data.agentB)) ?? 0) + num(e.data.pointsB),
			);
		}
		return m;
	}

	function duelOf(e: GatheringEvent, speed: number): StageDuel {
		const d = e.data,
			an = nameOf(d.agentA),
			bn = nameOf(d.agentB);
		const ma = num(d.moveA),
			mb = num(d.moveB),
			pa = num(d.pointsA),
			pb = num(d.pointsB);
		const prior = priorLight(e);
		const side = (agent: unknown, name: string, move: number, gain: number) => {
			const aspect = aspectOf(agent);
			return {
				name,
				aspect,
				move,
				gain,
				lit: prior.get(low(agent)) ?? 0,
				sub: T.wears(T.aspects[aspect] ?? T.aspects[0]),
			};
		};
		let title: string, line1: string, line2: string;
		if (ma === 0 && mb === 0) {
			title = T.bothKindle;
			line1 = T.risesTogether;
			line2 = pa === pb ? T.eachTakes(pa) : T.bothTake(an, pa, bn, pb);
		} else if (ma === 1 && mb === 1) {
			title = T.bothDevour;
			line1 = T.glassDarkens;
			line2 = T.bothTake(an, pa, bn, pb);
		} else {
			const [dev, vic, g] = ma === 1 ? [an, bn, pa] : [bn, an, pb];
			title = T.devours(dev);
			line1 = T.drained(vic);
			line2 = T.takes(dev, g);
		}
		if (d.forfeit === true || d.forfeit === "true") {
			title = T.silence;
			line1 = T.silenceLine;
		}
		return {
			a: side(d.agentA, an, ma, pa),
			b: side(d.agentB, bn, mb, pb),
			title,
			line1,
			line2,
			announce: `${title}. ${line1} ${line2}`,
			speed,
		};
	}

	function pump() {
		const st = stageRef.current;
		if (!st || busy.current) return;
		const next = queue.current.shift();
		if (!next) return;
		busy.current = true;
		posed.current = true;
		setPlaying(true);
		const backlog = queue.current.length;
		const speed = backlog > 4 ? 3 : backlog > 1 ? 1.7 : 1;
		st.play(duelOf(next, speed))
			.then(() => new Promise((r) => setTimeout(r, 1400 / speed)))
			.finally(() => {
				busy.current = false;
				setPlaying(false);
				pump();
			});
	}

	// ---------- derived HUD ----------
	const g = data?.gathering ?? null;
	const active = !!data?.active && !!g;
	const phaseText = !active ? T.phase.closed : g ? T.phase[g.phase] : "";
	const deadline =
		g && active
			? g.phase === "commit"
				? g.commitDeadline
				: g.phase === "reveal"
					? g.revealDeadline
					: 0
			: 0;
	const countdown = deadline > now ? T.until(fmtClock(deadline - now)) : "";
	const tollText =
		g && active ? T.toll(Math.min(g.round + 1, g.rounds), g.rounds) : "";

	const feed = useMemo(() => {
		const out: { k: string; text: string; tone: "bone" | "blood" | "gilt" }[] =
			[];
		for (const e of data?.events ?? []) {
			const k = evKey(e);
			switch (e.name) {
				case "BoutOpened":
					out.push({ k, text: T.opened, tone: "gilt" });
					break;
				case "RoundStarted":
					out.push({ k, text: T.tolled(num(e.round) + 1), tone: "bone" });
					break;
				case "Committed":
					out.push({ k, text: T.sealed(nameOf(e.agent)), tone: "bone" });
					break;
				case "Revealed":
					out.push(
						num(e.data.move) === 1
							? { k, text: T.devoured(nameOf(e.agent)), tone: "blood" }
							: { k, text: T.kindled(nameOf(e.agent)), tone: "gilt" },
					);
					break;
				case "PairScored": {
					const ma = num(e.data.moveA),
						mb = num(e.data.moveB),
						an = nameOf(e.data.agentA),
						bn = nameOf(e.data.agentB);
					const text =
						ma === 0 && mb === 0
							? T.pairKindle(an, bn)
							: ma === 1 && mb === 1
								? T.pairRuin(an, bn)
								: ma === 1
									? T.pairDevour(an, bn)
									: T.pairDevour(bn, an);
					out.push({ k, text, tone: ma === 0 && mb === 0 ? "gilt" : "blood" });
					break;
				}
				case "BoutClosed":
					out.push({ k, text: T.closed, tone: "gilt" });
					break;
			}
		}
		return out.slice(-7).reverse();
		// biome-ignore lint/correctness/useExhaustiveDependencies: names derive from people
	}, [data, people]);

	const toneColor = { bone: BONE, blood: "#e0565b", gilt: GILT } as const;
	const offsetX = boxRef.current
		? (boxRef.current.clientWidth - W * scale) / 2
		: 0;

	return (
		<div
			ref={boxRef}
			style={{
				position: "relative",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				background: "#050403",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: Math.max(0, offsetX),
					top: 0,
					width: W,
					height: H,
					transform: `scale(${scale})`,
					transformOrigin: "0 0",
				}}
			>
				<div ref={hostRef} style={{ position: "absolute", inset: 0 }} />

				{/* the toll, the phase and its countdown, in the dark of the vault */}
				<div
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						top: 14,
						textAlign: "center",
						pointerEvents: "none",
						color: BONE,
						textShadow: SHADOW,
					}}
				>
					{tollText && (
						<div
							style={{ ...GOTH, fontSize: 20, color: GILT, letterSpacing: 0.5 }}
						>
							{tollText}
						</div>
					)}
					<div style={{ ...SERIF, fontSize: 14 }}>{phaseText}</div>
					{countdown && (
						<div style={{ ...SERIF, fontSize: 12.5, color: BONE_D }}>
							{countdown}
						</div>
					)}
					{vision && (
						<div
							style={{ ...SERIF, fontSize: 11, color: BONE_D, opacity: 0.8 }}
						>
							{T.vision}
						</div>
					)}
				</div>

				<button
					type="button"
					onClick={() => setLedgerOpen(true)}
					aria-label={T.ledgerTitle}
					style={{
						position: "absolute",
						right: 10,
						top: 14,
						padding: "6px 10px",
						border: `1px solid ${BONE_D}`,
						borderRadius: 2,
						background: "rgba(11,8,7,.75)",
						color: GILT,
						...GOTH,
						fontSize: 16,
						cursor: "pointer",
					}}
				>
					{T.ledger}
				</button>

				{/* between duels: the feed of rites on the floor; when no Gathering, the waiting word */}
				<div
					style={{
						position: "absolute",
						left: 24,
						right: 24,
						top: 470,
						height: 220,
						opacity: playing ? 0 : 1,
						transition: "opacity .4s",
						pointerEvents: "none",
						textAlign: "center",
						textShadow: SHADOW,
					}}
				>
					{!active && (
						<div style={{ marginBottom: 12 }}>
							<div style={{ ...GOTH, fontSize: 26, color: GILT }}>
								{T.waiting}
							</div>
							<div style={{ ...SERIF, fontSize: 13.5, color: BONE }}>
								{data?.gathering ? T.lastResult : T.waitingHint}
							</div>
						</div>
					)}
					<div
						style={{
							...SERIF,
							fontSize: 11.5,
							color: BONE_D,
							letterSpacing: 1,
							marginBottom: 4,
						}}
					>
						{T.feedTitle}
					</div>
					{feed.length === 0 && (
						<div style={{ ...SERIF, fontSize: 13.5, color: BONE_D }}>
							{T.quiet}
						</div>
					)}
					{feed.map((f, i) => (
						<div
							key={f.k}
							style={{
								...SERIF,
								fontSize: 14,
								lineHeight: 1.45,
								color: toneColor[f.tone],
								opacity: 1 - i * 0.12,
							}}
						>
							{f.text}
						</div>
					))}
				</div>

				{/* the ledger of Light */}
				{ledgerOpen && (
					<div
						role="dialog"
						aria-label={T.ledgerTitle}
						style={{
							position: "absolute",
							inset: 0,
							background: "rgba(5,4,3,.55)",
						}}
						onClick={() => setLedgerOpen(false)}
						onKeyDown={(e) => e.key === "Escape" && setLedgerOpen(false)}
					>
						<div
							onClick={(e) => e.stopPropagation()}
							onKeyDown={() => {}}
							style={{
								position: "absolute",
								left: 0,
								right: 0,
								bottom: 0,
								maxHeight: 560,
								overflowY: "auto",
								background: "#140e0a",
								borderTop: `2px solid ${BONE_D}`,
								boxShadow: "0 -12px 30px #000",
								padding: "14px 16px 24px",
								color: BONE,
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: 8,
								}}
							>
								<div style={{ ...GOTH, fontSize: 22, color: GILT }}>
									{T.ledgerTitle}
								</div>
								<button
									type="button"
									onClick={() => setLedgerOpen(false)}
									style={{
										...SERIF,
										fontSize: 14,
										background: "none",
										border: 0,
										color: BONE_D,
										cursor: "pointer",
									}}
								>
									{T.close}
								</button>
							</div>
							{(standings?.rows.length ?? 0) === 0 && (
								<div style={{ ...SERIF, fontSize: 14, color: BONE_D }}>
									{T.ledgerEmpty}
								</div>
							)}
							{standings?.rows.map((r, i) => (
								<div
									key={r.agent}
									style={{
										display: "grid",
										gridTemplateColumns: "28px 40px 1fr auto",
										alignItems: "center",
										gap: 8,
										padding: "5px 0",
										borderBottom: "1px solid #2b1e16",
									}}
								>
									<span
										style={{
											...GOTH,
											fontSize: 16,
											color: i < 3 ? GILT : BONE_D,
											textAlign: "right",
										}}
									>
										{i + 1}
									</span>
									<span
										aria-hidden="true"
										style={{ filter: "grayscale(.3) sepia(.3)" }}
										// biome-ignore lint/security/noDangerouslySetInnerHtml: mask SVG is generated in code
										dangerouslySetInnerHTML={{
											__html: mask
												? mask(ASPECT_KEYS[r.aspect] ?? "mercy", 36)
												: "",
										}}
									/>
									<span
										style={{
											...SERIF,
											fontSize: 15,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{r.name || T.nameless}
										<span style={{ fontSize: 11.5, color: BONE_D }}>
											{" "}
											{T.wears(T.aspects[r.aspect] ?? T.aspects[0])}
										</span>
									</span>
									<span
										style={{
											...GOTH,
											fontSize: 17,
											color: r.light > 0 ? GILT : BLOOD_L,
										}}
									>
										{r.light}{" "}
										<span style={{ ...SERIF, fontSize: 11, color: BONE_D }}>
											{T.light}
										</span>
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
