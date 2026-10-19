"use client";

// The Gathering: watch the masked duel, toll by toll.
//
// The ink stage (src/scene/inkStage.js) draws the place: the cathedral, the shader windows, the
// medallion rings and the caustic floor. It is scaled to COVER this box (layout.ts), so it is
// always full-bleed. Over it this screen lays what a player reads: the two masks in their glass,
// engraved name plates, the bell, the verdict with its hit-stop, shake and flash, the medallions
// of Light flying to each tally, the phase banner, the feed of rites and the Ledger sheet.
// The stage paces each duel and announces its beats; the DOM follows them.
import {
	type MotionStyle,
	motion,
	useAnimate,
	useReducedMotion,
} from "motion/react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { readGathering, readStandings, useApi } from "@/client/api";
import { gathering as T } from "@/lexicon/gathering.ts";
import type {
	Stage,
	StageBeat,
	StageBeatInfo,
	StageGeom,
} from "@/scene/inkStage.js";
import { easeInOut, IMPACT, impact, spring, useShake } from "@/ui/motion";
import { type Beat, FaceOff } from "./FaceOff.tsx";
import { Lower } from "./Feed.tsx";
import { fixtureGathering, fixtureStandings } from "./fixture.ts";
import css from "./gathering.module.css";
import { Hud } from "./Hud.tsx";
import { LedgerButton, LedgerSheet } from "./Ledger.tsx";
import { fitStage, GEOM } from "./layout.ts";
import {
	type Duel,
	describeDuel,
	evKey,
	feedOf,
	heldLight,
	low,
	makeLookup,
	type SideKey,
	type Who,
} from "./model.ts";
import type {
	GatheringEvent,
	GatheringResponse,
	StandingsResponse,
} from "./types.ts";
import { Flight, Verdict } from "./Verdict.tsx";

/** Height kept clear at the foot for the Ledger plaque and the hourglass. */
const DOCK_H = 74;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PLAYING = new Set<Beat>(["arrive", "hush", "reveal", "tally"]);
const SHOWS_VERDICT = new Set<Beat>(["reveal", "tally", "end"]);

export function GatheringScreen() {
	const rootRef = useRef<HTMLDivElement>(null);
	const hostRef = useRef<HTMLDivElement>(null);
	const hudRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<Stage | null>(null);
	const tallyA = useRef<HTMLSpanElement>(null);
	const tallyB = useRef<HTMLSpanElement>(null);
	const tallyRefs = useMemo(() => ({ A: tallyA, B: tallyB }), []);
	const shaker = useShake<HTMLDivElement>();
	const [flashScope, animateFlash] = useAnimate<HTMLDivElement>();
	const reduce = useReducedMotion();
	const api = useApi();

	const [box, setBox] = useState({ w: 390, h: 776, hud: 84 });
	const [geom, setGeom] = useState<StageGeom>(GEOM);
	const [ready, setReady] = useState(false);
	const [data, setData] = useState<GatheringResponse | null>(null);
	const [vision, setVision] = useState(false);
	const [standings, setStandings] = useState<StandingsResponse | null>(null);
	const [mine, setMine] = useState<string | null>(null);
	const [pair, setPair] = useState<Record<SideKey, Who> | null>(null);
	const [duel, setDuel] = useState<Duel | null>(null);
	const [beat, setBeat] = useState<Beat>("idle");
	const [span, setSpan] = useState(2);
	const [hushSpan, setHushSpan] = useState(1.1);
	const [tally, setTally] = useState<Record<SideKey, number>>({ A: 0, B: 0 });
	const [ledgerOpen, setLedgerOpen] = useState(false);

	// ---------- measure the box and the banner ----------
	useLayoutEffect(() => {
		const root = rootRef.current,
			hud = hudRef.current;
		if (!root) return;
		const measure = () =>
			setBox((b) => {
				const n = {
					w: root.clientWidth,
					h: root.clientHeight,
					hud: hud?.offsetHeight ?? b.hud,
				};
				return n.w === b.w && n.h === b.h && n.hud === b.hud ? b : n;
			});
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(root);
		if (hud) ro.observe(hud);
		return () => ro.disconnect();
	}, []);
	const fit = useMemo(() => fitStage(box.w, box.h, box.hud, geom), [box, geom]);

	// ---------- who is mine ----------
	const apiRef = useRef(api);
	apiRef.current = api;
	useEffect(() => {
		let alive = true;
		apiRef.current
			.me()
			.then(
				(m) =>
					alive && setMine(m.fragment?.agent ? low(m.fragment.agent) : null),
			)
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);

	// ---------- the duel queue ----------
	const seen = useRef(new Set<string>());
	const queue = useRef<GatheringEvent[]>([]);
	const busy = useRef(false);
	const first = useRef(true);
	const posed = useRef(false);
	const dataRef = useRef<GatheringResponse | null>(null);
	const duelRef = useRef<Duel | null>(null);
	const fixtureCursor = useRef(0);

	const who = useMemo(
		() => makeLookup(data, standings?.rows, mine),
		[data, standings, mine],
	);
	const whoRef = useRef(who);
	whoRef.current = who;

	const pump = useCallback(() => {
		const st = stageRef.current;
		if (!st || busy.current) return;
		const next = queue.current.shift();
		if (!next) return;
		busy.current = true;
		posed.current = true;
		const backlog = queue.current.length;
		const speed = backlog > 4 ? 3 : backlog > 1 ? 1.7 : 1;
		const d = describeDuel(next, dataRef.current?.events ?? [], whoRef.current);
		duelRef.current = d;
		setDuel(d);
		setPair({ A: d.a, B: d.b });
		setTally({ A: d.a.lit, B: d.b.lit });
		setBeat("arrive");
		st.play({
			a: { aspect: d.a.aspect, lit: d.a.lit, move: d.a.move, gain: d.a.gain },
			b: { aspect: d.b.aspect, lit: d.b.lit, move: d.b.move, gain: d.b.gain },
			speed,
		})
			.then(() => wait(queue.current.length ? 1500 / speed : 4200))
			.finally(() => {
				busy.current = false;
				if (stageRef.current !== st) return;
				if (queue.current.length) pump();
				else setBeat("rest");
			});
	}, []);

	const pollGathering = useCallback(async () => {
		const r = (await readGathering()) as GatheringResponse | null;
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
			// a vision: keep the nave alive by replaying the past duels in turn
			queue.current.push(
				scored[fixtureCursor.current++ % scored.length] as GatheringEvent,
			);
		}
		if (queue.current.length > 8)
			queue.current.splice(0, queue.current.length - 8);
		pump();
	}, [pump]);

	useEffect(() => {
		void pollGathering();
		const a = setInterval(() => void pollGathering(), 3000);
		const loadStandings = async () =>
			setStandings(
				((await readStandings()) as StandingsResponse | null) ??
					fixtureStandings(),
			);
		void loadStandings();
		const b = setInterval(() => void loadStandings(), 15000);
		return () => {
			clearInterval(a);
			clearInterval(b);
		};
	}, [pollGathering]);

	// ---------- the stage and its beats ----------
	const onBeat = useEffectEvent((b: StageBeat, info: StageBeatInfo) => {
		const d = duelRef.current;
		if (b === "tally") setSpan(info.until);
		if (b === "hush") setHushSpan(info.until);
		if (b === "end" && d)
			setTally({ A: d.a.lit + d.a.gain, B: d.b.lit + d.b.gain });
		setBeat(b);
	});

	useEffect(() => {
		let alive = true;
		let st: Stage | null = null;
		(async () => {
			const { mountStage } = await import("@/scene/inkStage.js");
			const host = hostRef.current;
			if (!alive || !host) return;
			st = await mountStage(host, { onBeat: (b, i) => onBeat(b, i) });
			if (!alive) {
				st.destroy();
				return;
			}
			if (
				process.env.NODE_ENV !== "production" &&
				JSON.stringify(st.geom) !== JSON.stringify(GEOM)
			)
				console.warn("[gathering] stage geometry drifted from layout.ts");
			stageRef.current = st;
			setGeom(st.geom);
			setReady(true);
		})().catch((e) => console.error("[gathering] stage", e));
		return () => {
			alive = false;
			stageRef.current = null;
			busy.current = false;
			st?.destroy();
		};
	}, []);

	useEffect(() => {
		if (ready) pump();
	}, [ready, pump]);

	useEffect(() => {
		if (ready) stageRef.current?.setView({ top: fit.top, bottom: fit.bottom });
	}, [ready, fit]);

	// Before any duel has played, set two masked Fragments in the windows at rest.
	useEffect(() => {
		const st = stageRef.current;
		if (!ready || !st || posed.current || busy.current) return;
		const ps = data?.gathering?.participants ?? [];
		const p = ps[0] ?? standings?.rows[0];
		const q = ps[1] ?? standings?.rows[1];
		if (!p || !q) return;
		posed.current = true;
		const held = heldLight(data?.events ?? []);
		const A = who(p.agent),
			B = who(q.agent);
		const lit = { A: held.get(A.agent) ?? 0, B: held.get(B.agent) ?? 0 };
		st.setPair(
			{ aspect: A.aspect, lit: lit.A },
			{ aspect: B.aspect, lit: lit.B },
		);
		setPair({ A, B });
		// No Gathering held yet: the plates show the Light each holds in the Ledger instead.
		const ledger = (agent: string) =>
			standings?.rows.find((r) => low(r.agent) === agent)?.light ?? 0;
		setTally(
			data?.gathering ? lit : { A: ledger(A.agent), B: ledger(B.agent) },
		);
		setBeat("idle");
	}, [ready, data, standings, who]);

	// ---------- juice ----------
	const onImpact = useCallback(() => {
		const d = duelRef.current;
		if (!d) return;
		const preset =
			d.kind === "kindle"
				? IMPACT.kindle
				: d.kind === "ruin"
					? IMPACT.ruin
					: IMPACT.devour;
		void impact(shaker, { ...preset, stop: 0 });
		if (reduce) return;
		const root = flashScope.current;
		const light = root?.querySelector<HTMLElement>("[data-flash]");
		const blood = root?.querySelector<HTMLElement>("[data-blood]");
		if (light)
			animateFlash(
				light,
				{ opacity: [0, d.kind === "kindle" ? 0.42 : 0.55, 0] },
				{ duration: 0.34, times: [0, 0.1, 1], ease: "easeOut" },
			);
		if (blood && d.kind !== "kindle")
			animateFlash(
				blood,
				{ opacity: [0, d.kind === "ruin" ? 0.7 : 0.55, 0] },
				{ duration: 0.8, delay: 0.05, times: [0, 0.14, 1], ease: "easeOut" },
			);
	}, [shaker, reduce, flashScope, animateFlash]);

	const onLand = useCallback((k: SideKey) => {
		const d = duelRef.current;
		if (!d) return;
		const s = k === "A" ? d.a : d.b;
		setTally((t) => ({ ...t, [k]: Math.min(s.lit + s.gain, t[k] + 1) }));
	}, []);

	const onTouch = useCallback(() => {
		if (PLAYING.has(beatRef.current)) stageRef.current?.skip();
	}, []);
	const beatRef = useRef(beat);
	beatRef.current = beat;

	// ---------- derived ----------
	const g = data?.gathering ?? null;
	const active = !!data?.active && !!g;
	const rows = standings?.rows ?? [];
	const feed = useMemo(() => feedOf(data?.events ?? [], who), [data, who]);
	const toll = duel
		? duel.toll
		: g && active
			? Math.min(g.round + 1, g.rounds)
			: 0;
	const playing = PLAYING.has(beat);
	// The open floor between the plates and the dock (Ledger plaque).
	const lowerTop = Math.max(fit.y(geom.FT) + 10, fit.y(geom.SC) + 100);
	const lowerBottom = DOCK_H;
	const showVerdict = !!duel && SHOWS_VERDICT.has(beat);
	// Between the two masks: where the camera leans in during the hush.
	const focusY = fit.y(geom.GTOP + geom.GH * 0.5);
	const openLedger = useCallback(() => setLedgerOpen(true), []);
	const closeLedger = useCallback(() => setLedgerOpen(false), []);

	return (
		<div
			ref={rootRef}
			className={css.root}
			data-beat={beat}
			data-ready={ready ? "true" : "false"}
			style={{ "--hud-h": `${box.hud}px` } as CSSProperties}
		>
			<div ref={shaker.ref} className={css.world} onPointerDown={onTouch}>
				<motion.div
					className={css.zoom}
					style={{ transformOrigin: `50% ${Math.round(focusY)}px` }}
					initial={false}
					animate={{ scale: beat === "hush" ? 1.06 : 1 }}
					transition={
						beat === "hush"
							? { duration: hushSpan + 0.15, ease: easeInOut }
							: { ...spring.snappy, delay: beat === "reveal" ? 0.2 : 0 }
					}
				>
					<div
						ref={hostRef}
						className={css.stageHost}
						data-narrow={fit.narrow ? "true" : "false"}
						style={{
							transform: `translate(${(-fit.ox * fit.s).toFixed(2)}px, ${(-fit.oy * fit.s).toFixed(2)}px) scale(${fit.s.toFixed(4)})`,
						}}
					/>
					<div className={css.shadeTop} />
					<div className={css.shadeBottom} />
					<motion.div
						className={css.hush}
						style={{ "--hush-y": `${Math.round(focusY)}px` } as MotionStyle}
						initial={false}
						animate={{ opacity: beat === "hush" ? 1 : 0 }}
						transition={
							beat === "hush"
								? { duration: hushSpan }
								: { duration: 0.3, delay: beat === "reveal" ? 0.2 : 0 }
						}
					/>
					{ready && (
						<FaceOff
							fit={fit}
							geom={geom}
							pair={pair}
							duel={duel}
							beat={beat}
							tally={tally}
							toll={toll}
							tallyRefs={tallyRefs}
							hush={hushSpan}
						/>
					)}
					<Verdict
						duel={duel}
						show={showVerdict}
						top={lowerTop}
						bottom={lowerBottom}
						onImpact={onImpact}
					/>
				</motion.div>
				<Lower
					show={ready && !playing && !showVerdict}
					top={lowerTop}
					bottom={lowerBottom}
					active={active}
					ended={!!data?.gathering && !active}
					feed={feed}
				/>
			</div>

			<Flight
				duel={duel}
				active={beat === "tally" || beat === "end"}
				span={span}
				rootRef={rootRef}
				tallyRefs={tallyRefs}
				floor={[box.w / 2, (lowerTop + box.h - lowerBottom) / 2]}
				onLand={onLand}
			/>

			<div ref={flashScope} aria-hidden="true">
				<div className={css.flash} data-flash />
				<div className={css.flashBlood} data-blood />
			</div>

			<Hud ref={hudRef} data={data} vision={vision} />

			<div className={css.dock}>
				<LedgerButton rows={rows} mine={mine} onOpen={openLedger} />
				{playing && (
					<motion.button
						type="button"
						className={css.skip}
						onClick={() => stageRef.current?.skip()}
						aria-label={T.pass}
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						whileTap={{ scale: 0.9 }}
					>
						<Hourglass />
					</motion.button>
				)}
			</div>

			<LedgerSheet
				open={ledgerOpen}
				rows={rows}
				mine={mine}
				onClose={closeLedger}
			/>
		</div>
	);
}

/** The hourglass from the ink study's floor, as a button glyph. */
function Hourglass() {
	return (
		<svg viewBox="-16 -24 32 48" aria-hidden="true">
			<polygon
				points="-13,-21 13,-21 12,-16 -12,-16"
				fill="#4a3626"
				stroke="#0b0807"
				strokeWidth="1.6"
			/>
			<polygon
				points="-13,16 13,16 14,21 -14,21"
				fill="#4a3626"
				stroke="#0b0807"
				strokeWidth="1.6"
			/>
			<path d="M-11 -16 V16 M11 -16 V16" stroke="#0b0807" strokeWidth="2.6" />
			<path d="M-11 -16 V16" stroke="#6b5139" strokeWidth="1" />
			<path
				d="M-8 -16 Q-8 -4 0 0 Q-8 4 -8 16 H8 Q8 4 0 0 Q8 -4 8 -16Z"
				fill="#d8c6a0"
				opacity=".14"
			/>
			<path d="M-6.5 16 Q0 7 6.5 16Z" fill="#c9a24f" />
			<path d="M-4.5 -8 Q0 -3 4.5 -8Z" fill="#c9a24f" opacity=".8" />
			<path d="M0 -2 V12" stroke="#e3c27c" strokeWidth=".9" />
			<path
				d="M-8 -16 Q-8 -4 0 0 Q-8 4 -8 16 H8 Q8 4 0 0 Q8 -4 8 -16Z"
				fill="none"
				stroke="#0b0807"
				strokeWidth="1.6"
			/>
		</svg>
	);
}
