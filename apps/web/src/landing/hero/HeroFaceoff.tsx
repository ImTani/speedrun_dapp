"use client";

/**
 * Hero B, The Face-off: the game in five seconds. Two great masked Fragments in their
 * windows face each other across the nave. The bell tolls, each chooses in secret, both
 * choices are unveiled and the verdict slams between them, with the Light it moved. Three
 * tolls, about six seconds each, then a new Gathering.
 *
 * The three tolls are a true duel: Vesper wears Inquisitor (tests a new rival, then preys on
 * the meek), Marrow wears Rancour (kindles until devoured once, then always devours).
 *   I    both kindle            +3 each
 *   II   Vesper devours Marrow  Vesper +5, Marrow +0
 *   III  both devour            +1 each
 *
 * One WebGL context (both windows and the atmosphere on the shared lens). The loop rests
 * while the hero is off screen or the tab hidden; reduced motion holds still on toll II.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FX, FxLayer, fx, PALETTES } from "@/fx";
import { gathering as G } from "@/lexicon/gathering";
import { landing as L } from "@/lexicon/landing";
import { Atmosphere } from "@/scene/AtmosphereLayer";
import { GlassWindow, type WindowMood } from "@/ui/GlassWindow";
import { easeOut, tween } from "@/ui/motion";
import { Count, Slam } from "@/ui/type";
import h from "./hero.module.css";
import { archH, type NaveSpec } from "./ink";
import {
	type Box,
	HeroMark,
	HeroPitch,
	HeroPlay,
	HeroQr,
	HeroScroll,
	NaveImage,
	useBox,
	useNave,
	useOnScreen,
} from "./shared";

const F = L.hero.faceoff;
type Move = "kindle" | "devour";
type Side = "a" | "b";
const SIDES: Side[] = ["a", "b"];
const NAME: Record<Side, string> = { a: F.left, b: F.right };
/** Vesper wears Inquisitor, Marrow wears Rancour. */
const ASPECT: Record<Side, number> = { a: 5, b: 3 };

const FIRST: Record<Side, Move> = { a: "kindle", b: "kindle" };
const TOLLS: readonly Record<Side, Move>[] = [
	FIRST,
	{ a: "devour", b: "kindle" },
	{ a: "devour", b: "devour" },
];

function pay(t: Record<Side, Move>): Record<Side, number> {
	if (t.a === "kindle" && t.b === "kindle") return { a: 3, b: 3 };
	if (t.a === "devour" && t.b === "devour") return { a: 1, b: 1 };
	return t.a === "devour" ? { a: 5, b: 0 } : { a: 0, b: 5 };
}

function verdictOf(t: Record<Side, Move>) {
	const p = pay(t);
	if (t.a === t.b)
		return {
			text: t.a === "kindle" ? G.verdict.bothKindle : G.verdict.bothDevour,
			sub: [F.each(p.a)],
			names: [] as string[],
			tone: t.a === "kindle" ? ("kindle" as const) : ("devour" as const),
		};
	const dev: Side = t.a === "devour" ? "a" : "b";
	const vic: Side = dev === "a" ? "b" : "a";
	return {
		text: G.verdict.devours(NAME[dev], NAME[vic]),
		sub: [F.took(NAME[dev], p[dev]), F.got(NAME[vic])],
		names: [NAME[dev], NAME[vic]],
		tone: "devour" as const,
	};
}

type Phase = "seal" | "unveil" | "rest";
/** How long each phase holds, in ms (one toll is about six seconds). */
const HOLD: Record<Phase, number> = { seal: 1500, unveil: 3500, rest: 1000 };

function moodOf(side: Side, t: Record<Side, Move>, phase: Phase): WindowMood {
	if (phase !== "unveil") return "lit";
	const other = t[side === "a" ? "b" : "a"];
	if (t[side] === "kindle" && other === "devour") return "waiting";
	if (t[side] === "devour" && other === "devour") return "stirring";
	return "lit";
}

/**
 * Where everything stands in the stage row (stage px). Phones: the name has its own row above,
 * the bell hangs between the arch heads and the verdict slams on the floor under the windows.
 * Wider: the stage takes the full height, the name sits at the head of the aisle between the
 * windows, the bell under it, the verdict under the bell.
 */
function layout({ w, h: hh }: Box) {
	const narrow = w < 960;
	const below = narrow ? 88 : 104; // sill, stamp and plate under each window
	const verdictH = narrow ? 132 : 0;
	const top = narrow ? 16 : 28;
	const maxW = narrow ? w * 0.4 : w * 0.25;
	const ww = Math.max(
		90,
		Math.min(maxW, ((hh - top - below - verdictH) * 300) / 420),
	);
	const wh = archH(ww);
	const off = narrow ? w * 0.25 : Math.max(w * 0.26, ww / 2 + 190);
	const cx = { a: w / 2 - off, b: w / 2 + off };
	const bottom = top + wh;
	/** The name's room at the head of the aisle (wider screens). */
	const mark = Math.min(170, wh * 0.34);
	const bell = narrow ? top - 8 : top + mark;
	const verdict = narrow
		? { left: 0, width: w, top: bottom + below, height: verdictH }
		: {
				left: cx.a + ww / 2 + 24,
				width: cx.b - cx.a - ww - 48,
				top: bell + 70,
				height: Math.max(180, bottom - bell - 70),
			};
	return { narrow, ww, wh, top, bottom, cx, bell, verdict };
}

export function HeroFaceoff() {
	const heroRef = useRef<HTMLElement>(null);
	const sceneRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const bellRef = useRef<HTMLDivElement>(null);
	const winRef = {
		a: useRef<HTMLDivElement>(null),
		b: useRef<HTMLDivElement>(null),
	};
	const scene = useBox(sceneRef);
	const stage = useBox(stageRef);
	const reduce = useReducedMotion() ?? false;
	const running = useOnScreen(heroRef) && !reduce;

	// The stage row's top in the hero (the windows hang in the scene, behind the words).
	const [stageTop, setStageTop] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-read when either box moves
	useEffect(() => {
		const el = stageRef.current;
		if (el) setStageTop(el.offsetTop);
	}, [scene, stage]);
	const lay = useMemo(() => (stage ? layout(stage) : null), [stage]);

	// ---- the loop: toll, seal, unveil, rest ----
	const [toll, setToll] = useState(1);
	const [phase, setPhase] = useState<Phase>("unveil");
	const [round, setRound] = useState(0);
	const [swell, setSwell] = useState({ a: 0, b: 0 });
	const [swing, setSwing] = useState(0);
	const started = useRef(false);
	useEffect(() => {
		if (!running) return;
		if (!started.current) {
			// First beat: start the Gathering from toll I.
			started.current = true;
			setToll(0);
			setPhase("seal");
			setSwing((n) => n + 1);
			return;
		}
		const t = window.setTimeout(() => {
			if (phase === "seal") setPhase("unveil");
			else if (phase === "unveil") setPhase("rest");
			else {
				const next = (toll + 1) % TOLLS.length;
				if (next === 0) setRound((r) => r + 1);
				setToll(next);
				setPhase("seal");
				setSwing((n) => n + 1);
			}
		}, HOLD[phase]);
		return () => window.clearTimeout(t);
	}, [running, phase, toll]);

	// The bell rings at every toll.
	useEffect(() => {
		if (swing > 0 && bellRef.current) fx.ring(bellRef.current, FX.gilt);
	}, [swing]);

	const cur = TOLLS[toll] ?? FIRST;
	const shown = phase !== "seal";
	const total = useMemo(() => {
		const out = { a: 0, b: 0 };
		const upto = shown ? toll : toll - 1;
		for (let i = 0; i <= upto; i++) {
			const p = pay(TOLLS[i] ?? FIRST);
			out.a += p.a;
			out.b += p.b;
		}
		return out;
	}, [toll, shown]);
	const v = verdictOf(cur);

	const onImpact = () => {
		const ea = winRef.a.current;
		const eb = winRef.b.current;
		if (!ea || !eb) return;
		if (cur.a === "kindle" && cur.b === "kindle") {
			setSwell((s) => ({ a: s.a + 1, b: s.b + 1 }));
			fx.burst("kindle", ea, { amount: 0.6 });
			fx.burst("kindle", eb, { amount: 0.6 });
		} else if (cur.a === "devour" && cur.b === "devour") {
			fx.burst("ash", ea, { amount: 0.5 });
			fx.burst("ash", eb, { amount: 0.5 });
		} else {
			const dev = cur.a === "devour" ? "a" : "b";
			const vic = dev === "a" ? eb : ea;
			setSwell((s) => ({ ...s, [dev]: s[dev] + 1 }));
			fx.burst("shards", vic, { palette: PALETTES.devour, amount: 0.7 });
			fx.burst("embers", dev === "a" ? ea : eb, { amount: 0.6 });
		}
	};

	const floor =
		lay && stage ? stageTop + lay.bottom + (lay.narrow ? 54 : 64) : 0;
	const spec: NaveSpec | null =
		scene && lay
			? {
					w: scene.w,
					h: scene.h,
					floor,
					focus: [scene.w / 2, floor - 40],
					piers: lay.narrow
						? []
						: [scene.w / 2, lay.cx.a - lay.ww, lay.cx.b + lay.ww],
					seed: 3311,
				}
			: null;
	const nave = useNave(spec);

	return (
		<header ref={heroRef} className={`${h.hero} ${h.duelHero}`}>
			<div ref={sceneRef} className={h.scene} aria-hidden="true">
				{scene && lay ? (
					<>
						<NaveImage src={nave} box={scene} />
						{SIDES.map((k) => (
							<div
								key={k}
								ref={winRef[k]}
								className={h.duelWin}
								style={{
									left: lay.cx[k] - lay.ww / 2,
									top: stageTop + lay.top,
									width: lay.ww,
								}}
							>
								<GlassWindow
									aspect={ASPECT[k]}
									width={Math.round(lay.ww)}
									mood={moodOf(k, cur, phase)}
									swell={swell[k]}
								/>
							</div>
						))}
						<Atmosphere preset="balanced" floor={floor / scene.h} lean={0} />
					</>
				) : null}
			</div>

			<div className={h.pool} aria-hidden="true" />
			<div className={h.duelTop}>
				<HeroMark className={h.duelMark} />
			</div>

			<div
				ref={stageRef}
				className={h.duelStage}
				role="img"
				aria-label={F.aria}
			>
				{lay ? (
					<>
						<div
							className={h.bell}
							style={{
								left: "50%",
								top: lay.bell,
							}}
						>
							<motion.div
								ref={bellRef}
								key={swing}
								className={h.bellArt}
								initial={false}
								animate={reduce ? {} : { rotate: [0, 16, -12, 7, -3, 0] }}
								transition={{ duration: 1.4, ease: "easeOut" }}
							>
								<Bell />
							</motion.div>
							<span className={h.tollMark}>{G.tollMark(toll + 1)}</span>
						</div>
						{SIDES.map((k) => (
							<div
								key={k}
								className={h.duelSide}
								style={{
									left: lay.cx[k],
									top: lay.bottom + 26,
									width: Math.max(lay.ww + 40, 132),
								}}
							>
								<Stamp move={shown ? cur[k] : null} />
								<p className={h.duelName}>{NAME[k]}</p>
								<Count
									key={round}
									value={total[k]}
									unit={F.light}
									size="sm"
									showDelta={!reduce}
								/>
							</div>
						))}
						<div
							className={h.verdict}
							style={{
								left: lay.verdict.left,
								top: lay.verdict.top,
								width: lay.verdict.width,
								height: lay.verdict.height,
							}}
						>
							<AnimatePresence>
								{shown && phase === "unveil" ? (
									<motion.div
										key={`${round}-${toll}`}
										className={h.verdictIn}
										exit={{
											opacity: 0,
											y: -10,
											filter: "blur(4px)",
											transition: tween.out,
										}}
									>
										<Slam
											text={v.text}
											sub={v.sub}
											kicker={G.verdictKicker(toll + 1)}
											names={v.names}
											tone={v.tone}
											delay={0.12}
											live={false}
											onImpact={onImpact}
										/>
									</motion.div>
								) : null}
							</AnimatePresence>
						</div>
					</>
				) : null}
			</div>

			<div className={h.duelWords}>
				<p className={h.rule}>{F.rule}</p>
				<HeroPitch />
				<HeroPlay />
			</div>
			<HeroQr className={h.qrCorner} />
			<HeroScroll />
			<FxLayer />
		</header>
	);
}

/** What a Fragment chose, stamped under its window: hidden while it chooses, then unveiled. */
function Stamp({ move }: { move: Move | null }) {
	const label = move ? G.stamp[move] : F.sealed;
	return (
		<span className={h.stampBox}>
			<AnimatePresence mode="wait" initial={false}>
				<motion.span
					key={move ?? "sealed"}
					className={h.stamp}
					data-move={move ?? "sealed"}
					initial={{ opacity: 0, rotateX: -80, scale: 1.25 }}
					animate={{ opacity: 1, rotateX: 0, scale: 1 }}
					exit={{ opacity: 0, rotateX: 80, transition: { duration: 0.14 } }}
					transition={{ duration: 0.32, ease: easeOut }}
				>
					{move ? null : <Seal />}
					{label}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

/** A little wax seal: the choice is sealed until the unveiling. */
function Seal() {
	return (
		<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
			<circle
				cx="10"
				cy="10"
				r="8.4"
				fill="#8e1218"
				stroke="#0b0807"
				strokeWidth="1.4"
			/>
			<circle
				cx="10"
				cy="10"
				r="5"
				fill="none"
				stroke="#e3c27c"
				strokeWidth="1"
				opacity=".7"
			/>
			<path
				d="M10 6.6 V13.4 M6.6 10 H13.4"
				stroke="#e3c27c"
				strokeWidth="1"
				opacity=".7"
			/>
		</svg>
	);
}

/** The bell on the pier between the windows, in the house ink. */
function Bell() {
	return (
		<svg viewBox="0 0 48 52" width="48" height="52" aria-hidden="true">
			<defs>
				<linearGradient id="hbBell" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#5a4430" />
					<stop offset=".4" stopColor="#e3c27c" />
					<stop offset=".7" stopColor="#c9a24f" />
					<stop offset="1" stopColor="#3a2a1d" />
				</linearGradient>
			</defs>
			<path d="M24 2 v6" stroke="#0b0807" strokeWidth="3" />
			<path
				d="M24 7 C14 7 12 16 12 26 C12 34 8 38 5 42 H43 C40 38 36 34 36 26 C36 16 34 7 24 7 Z"
				fill="url(#hbBell)"
				stroke="#0b0807"
				strokeWidth="2.4"
				strokeLinejoin="round"
			/>
			<path
				d="M5 42 H43"
				stroke="#0b0807"
				strokeWidth="3.4"
				strokeLinecap="round"
			/>
			<circle
				cx="24"
				cy="46.5"
				r="4"
				fill="#c9a24f"
				stroke="#0b0807"
				strokeWidth="2"
			/>
		</svg>
	);
}
