"use client";

// The two Fragments facing each other: their masks hung in the glass, the bell on the pier
// between them, what each chose stamped under its mask, and an engraved plate on the sill
// with the Light it holds in this Gathering.
import {
	AnimatePresence,
	type MotionStyle,
	motion,
	useAnimate,
	useReducedMotion,
	type Variants,
} from "motion/react";
import {
	type CSSProperties,
	type ReactNode,
	type RefObject,
	useEffect,
} from "react";
import { gathering as T } from "@/lexicon/gathering.ts";
import type { StageGeom } from "@/scene/inkStage.js";
import { Mask } from "@/ui/Mask";
import { easeIn, easeInOut, easeOut, spring } from "@/ui/motion";
import { Count, Plate } from "@/ui/type";
import css from "./gathering.module.css";
import type { StageFit } from "./layout.ts";
import {
	aspectGlyph,
	aspectName,
	type Duel,
	type SideKey,
	type Who,
} from "./model.ts";

export type Beat =
	| "idle"
	| "arrive"
	| "hush"
	| "reveal"
	| "tally"
	| "end"
	| "rest";

type Role = "rest" | "lean" | "devour" | "drained" | "kindle" | "ruin";

/** World size of a mask in its window (the glass is 128 wide). */
const MASK_W = 104;
/** World y of a mask's centre: the robed figure's face in the glass. */
const faceY = (g: StageGeom) => g.GTOP + g.GH * 0.55;

const SIDES: SideKey[] = ["A", "B"];
/** Toward the pier: A leans right, B leans left. */
const DIR: Record<SideKey, number> = { A: 1, B: -1 };

const OUTCOME = new Set<Beat>(["reveal", "tally", "end", "rest"]);

function roleOf(k: SideKey, duel: Duel | null, beat: Beat): Role {
	if (!duel || beat === "idle" || beat === "arrive") return "rest";
	if (beat === "hush") return "lean";
	if (!OUTCOME.has(beat)) return "rest";
	if (duel.kind === "kindle") return "kindle";
	if (duel.kind === "ruin") return "ruin";
	return duel.dev === k ? "devour" : "drained";
}

/** Direction toward the pier, and how long the hush lasts at the current pace (s). */
type Pose = { d: number; hush: number };

// Same filter shape in every pose so motion can tween between them.
const lit = (b: number, s: number, r: number, c: string) =>
	`brightness(${b}) saturate(${s}) drop-shadow(0px 0px ${r}px ${c})`;
const STRIKE = 0.2; // the verdict lands ~0.2s after the unveiling (see Slam)

const maskPose: Variants = {
	rest: {
		x: 0,
		y: 0,
		scale: 1,
		rotate: 0,
		filter: lit(1, 1, 0, "rgba(255,106,74,0)"),
		transition: { ...spring.soft, filter: { duration: 0.6 } },
	},
	lean: ({ d, hush }: Pose) => ({
		x: d * 11,
		y: -4,
		scale: 1.1,
		rotate: d * 4,
		filter: lit(1.1, 1.2, 12, "rgba(255,106,74,0.7)"),
		transition: { duration: hush, ease: easeInOut },
	}),
	devour: ({ d }: Pose) => ({
		x: [d * 7, d * 30, d * 12],
		y: [-3, -8, -4],
		scale: [1.06, 1.3, 1.12],
		rotate: [d * 3, d * 8, d * 2],
		filter: lit(1.16, 1.3, 16, "rgba(255,84,56,0.95)"),
		transition: {
			duration: 0.62,
			delay: STRIKE,
			times: [0, 0.2, 1],
			ease: easeOut,
			filter: { duration: 0.25, delay: STRIKE },
		},
	}),
	drained: ({ d }: Pose) => ({
		x: [d * 7, -d * 18, -d * 8],
		y: [-3, 2, 10],
		scale: [1.06, 0.88, 0.86],
		rotate: [d * 3, -d * 11, -d * 7],
		filter: lit(0.4, 0.12, 0, "rgba(0,0,0,0)"),
		transition: {
			duration: 0.75,
			delay: STRIKE,
			times: [0, 0.22, 1],
			ease: easeOut,
			filter: { duration: 1.6, delay: STRIKE + 0.3, ease: easeOut },
		},
	}),
	kindle: ({ d }: Pose) => ({
		x: d * 2,
		y: -10,
		scale: 1.12,
		rotate: 0,
		filter: lit(1.22, 1.15, 18, "rgba(245,223,160,0.95)"),
		transition: { ...spring.settle, delay: STRIKE },
	}),
	ruin: ({ d }: Pose) => ({
		x: [d * 7, -d * 15, -d * 10],
		y: [-3, 4, 8],
		scale: [1.06, 0.9, 0.9],
		rotate: [d * 3, -d * 9, -d * 6],
		filter: lit(0.62, 0.55, 12, "rgba(199,38,44,0.8)"),
		transition: { duration: 0.6, delay: STRIKE, ease: easeOut },
	}),
};

export function FaceOff({
	fit,
	geom,
	pair,
	duel,
	beat,
	tally,
	toll,
	tallyRefs,
	hush = 1.1,
	stamps = null,
}: {
	fit: StageFit;
	geom: StageGeom;
	pair: Record<SideKey, Who> | null;
	duel: Duel | null;
	beat: Beat;
	tally: Record<SideKey, number>;
	/** Numeral on the bell (0 hides it). */
	toll: number;
	tallyRefs: Record<SideKey, RefObject<HTMLSpanElement | null>>;
	/** Seconds the hush lasts at the current pace. */
	hush?: number;
	/** Type tuning: stamp this duel's banners now (again for each new `n`). */
	stamps?: { duel: Duel; n: number } | null;
}) {
	const mw = Math.round(MASK_W * fit.s);
	const fy = fit.y(faceY(geom));
	const stampDuel = stamps?.duel ?? duel;
	const showStamps = !!stampDuel && (!!stamps || OUTCOME.has(beat));
	const showSeals = !!duel && (beat === "arrive" || beat === "hush");

	return (
		<>
			{pair &&
				SIDES.map((k) => {
					const who = pair[k];
					const role = roleOf(k, duel, beat);
					const gutter = role === "drained" && beat !== "reveal";
					return (
						<div
							key={k}
							className={css.anchor}
							style={{ left: fit.x(geom.win[k].cx), top: fy }}
						>
							<div
								className={css.maskSlot}
								data-state={role}
								data-window={k}
								style={
									{
										"--mw": `${mw}px`,
										"--halo": geom.tint[k],
									} as CSSProperties
								}
							>
								<motion.div
									className={css.maskMotion}
									variants={maskPose}
									custom={{ d: DIR[k], hush } satisfies Pose}
									initial={false}
									animate={role}
								>
									<AnimatePresence initial={false}>
										<motion.div
											key={who.agent}
											className={css.maskFace}
											initial={{
												opacity: 0,
												y: -28,
												scale: 1.25,
												filter: "blur(6px)",
											}}
											animate={{
												opacity: 1,
												y: 0,
												scale: 1,
												filter: "blur(0px)",
												transition: {
													...spring.settle,
													opacity: { duration: 0.2 },
													filter: { duration: 0.3 },
												},
											}}
											exit={{
												opacity: 0,
												y: 22,
												scale: 0.85,
												filter: "blur(4px)",
												transition: { duration: 0.22, ease: easeIn },
											}}
										>
											<Breath phase={k === "A" ? 0 : 1.7}>
												<Mask
													aspect={who.aspect}
													size={mw}
													glow={!gutter}
													emit
													variant="gilded"
													shadow={false}
												/>
											</Breath>
										</motion.div>
									</AnimatePresence>
								</motion.div>
							</div>
						</div>
					);
				})}

			{toll > 0 && (
				<div
					className={css.anchor}
					style={{
						left: fit.x(geom.pier),
						top: fit.y(geom.GTOP + geom.GH * 0.42),
					}}
				>
					<Bell
						toll={toll}
						size={Math.round(44 * fit.s)}
						duelKey={duel?.key ?? ""}
						beat={beat}
					/>
				</div>
			)}

			<AnimatePresence>
				{showSeals &&
					duel &&
					SIDES.map((k, i) => (
						<div
							key={`seal${duel.key}${k}`}
							className={css.anchor}
							style={{
								left: fit.x(geom.win[k].cx),
								top: fit.y(geom.GBOT - 12),
							}}
						>
							<motion.span
								className={css.seal}
								style={
									{ "--seal": `${Math.round(36 * fit.s)}px` } as MotionStyle
								}
								initial={{ opacity: 0, scale: 1.8, y: -18 }}
								animate={
									beat === "hush"
										? {
												opacity: 1,
												scale: [1, 1.06, 1, 1.1, 1, 1.14],
												y: 0,
												rotate: [0, -5, 6, -8, 9, -10, 0],
												transition: {
													duration: Math.max(0.3, hush - 0.1),
													ease: easeIn,
													delay: i * 0.05,
												},
											}
										: {
												opacity: 1,
												scale: 1,
												y: 0,
												rotate: 0,
												transition: {
													...spring.slam,
													velocity: 0,
													delay: 0.12 + i * 0.08,
												},
											}
								}
								exit={{
									opacity: 0,
									scale: 2.2,
									rotate: DIR[k] * 25,
									filter: "blur(6px)",
									transition: { duration: 0.22, ease: easeOut },
								}}
							>
								<i />
							</motion.span>
						</div>
					))}
			</AnimatePresence>

			<AnimatePresence>
				{showStamps &&
					stampDuel &&
					SIDES.map((k, i) => {
						const s = k === "A" ? stampDuel.a : stampDuel.b;
						const tone = s.move === 1 ? "devour" : "kindle";
						return (
							<div
								key={`${stampDuel.key}${k}${stamps?.n ?? 0}`}
								className={css.anchor}
								style={{
									left: fit.x(geom.win[k].cx),
									top: fit.y(geom.GBOT - 12),
								}}
							>
								<motion.span
									className={css.stamp}
									data-tone={tone}
									initial={{ opacity: 0, scale: 2.4, rotate: DIR[k] * -14 }}
									animate={{
										opacity: 1,
										scale: 1,
										rotate: DIR[k] * -5,
										transition: {
											...spring.slam,
											velocity: 0,
											delay: STRIKE + 0.12 + i * 0.1,
											opacity: {
												duration: 0.08,
												delay: STRIKE + 0.12 + i * 0.1,
											},
										},
									}}
									exit={{ opacity: 0, transition: { duration: 0.18 } }}
								>
									{T.stamp[tone]}
								</motion.span>
							</div>
						);
					})}
			</AnimatePresence>

			{pair &&
				SIDES.map((k) => {
					const who = pair[k];
					const cx = fit.x(geom.win[k].cx);
					// as wide as the window's bay: from the pier to the box edge, whichever is nearer
					const half = Math.min(
						Math.abs(fit.x(geom.pier) - cx),
						k === "A" ? cx : fit.w - cx,
					);
					const w = Math.max(120, Math.min(2 * half - 10, 210));
					return (
						<div
							key={k}
							className={css.plateSlot}
							data-long={
								who.name.length > 18 ? 2 : who.name.length > 12 ? 1 : 0
							}
							style={
								{
									left: cx - w / 2,
									top: fit.y(geom.SC) - 8,
									width: w,
									"--aspect-glyph": aspectGlyph(who.aspect),
								} as CSSProperties
							}
						>
							<div className={css.plateStack}>
								<AnimatePresence initial={false}>
									<motion.div
										key={who.agent}
										style={{ width: "100%" }}
										initial={{ opacity: 0, y: 14, scale: 0.96 }}
										animate={{
											opacity: 1,
											y: 0,
											scale: 1,
											transition: {
												...spring.settle,
												opacity: { duration: 0.18 },
											},
										}}
										exit={{
											opacity: 0,
											y: -8,
											transition: { duration: 0.16, ease: easeIn },
										}}
									>
										<Plate
											name={who.name}
											epithet={aspectName(who.aspect)}
											marked={who.mine}
											size="sm"
											variant="slab"
											className={css.plate ?? ""}
										/>
									</motion.div>
								</AnimatePresence>
							</div>
							{who.mine && <span className={css.yours}>{T.yours}</span>}
							<span
								ref={tallyRefs[k]}
								className={css.tally}
								data-flare={beat === "tally" ? "true" : "false"}
								aria-hidden="true"
							>
								<i className={css.coin} />
								<Count key={who.agent} value={tally[k]} size="sm" tone="gilt" />
							</span>
						</div>
					);
				})}
		</>
	);
}

/** A slow breath so the masks never sit dead in the glass. */
function Breath({ phase, children }: { phase: number; children: ReactNode }) {
	const reduce = useReducedMotion();
	return (
		<motion.div
			style={{ display: "grid", placeItems: "center" }}
			animate={reduce ? {} : { y: [0, -3, 0], rotate: [0, 0.6, 0] }}
			transition={{
				duration: 5.2,
				repeat: Number.POSITIVE_INFINITY,
				ease: easeInOut,
				delay: phase,
			}}
		>
			{children}
		</motion.div>
	);
}

/** The bell on the pier: tolls (rings out) at the hush, flares at the unveiling. */
function Bell({
	toll,
	size,
	duelKey,
	beat,
}: {
	toll: number;
	size: number;
	duelKey: string;
	beat: Beat;
}) {
	const [scope, animate] = useAnimate<HTMLDivElement>();
	const reduce = useReducedMotion();

	// biome-ignore lint/correctness/useExhaustiveDependencies: replay per duel and beat only
	useEffect(() => {
		const root = scope.current;
		if (!root || reduce) return;
		const disc = root.querySelector<HTMLElement>("[data-disc]");
		const rings = root.querySelectorAll<HTMLElement>("[data-ring]");
		if (!disc) return;
		if (beat === "hush") {
			animate(
				disc,
				{ scale: [1, 1.28, 0.96, 1.04], rotate: [0, -6, 4, 0] },
				{ duration: 0.7, ease: easeOut },
			);
			rings.forEach((r, i) => {
				animate(
					r,
					{ opacity: [0.95, 0], scale: [1, 2.8] },
					{ duration: 1.25, delay: i * 0.22, ease: easeOut },
				);
			});
		} else if (beat === "reveal") {
			animate(
				disc,
				{
					scale: [1.04, 1.45, 1],
					filter: ["brightness(1)", "brightness(2.4)", "brightness(1)"],
				},
				{ duration: 0.55, delay: STRIKE, ease: easeOut },
			);
		}
	}, [beat, duelKey, reduce]);

	return (
		<div
			ref={scope}
			className={css.bell}
			style={{ "--bell": `${size}px` } as CSSProperties}
			aria-hidden="true"
		>
			<span className={css.bellRing} data-ring />
			<span className={css.bellRing} data-ring />
			<span className={css.bellRing} data-ring />
			<motion.span
				key={toll}
				className={css.bellDisc}
				data-disc
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1, transition: spring.settle }}
			>
				{T.tollMark(toll)}
			</motion.span>
		</div>
	);
}
