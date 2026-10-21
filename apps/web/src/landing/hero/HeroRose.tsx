"use client";

/**
 * Hero C, The Rose: a huge rose window turning slowly behind the name, the seven masks riding
 * in its panes. As each mask passes the top it lights, the glass takes its colours, and its
 * temper is written under the name ("Echo: does what its rival did last toll"). Light pours
 * from the rose onto the floor; slow parallax on the pointer and on scroll.
 *
 * One WebGL context (the rose and the atmosphere on the shared lens). Reduced motion: the
 * rose stands still with Echo at the top.
 */
import {
	animate,
	motion,
	useMotionValue,
	useMotionValueEvent,
	useTransform,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { L as Lx } from "@/lexicon";
import { landing as L } from "@/lexicon/landing";
import { Atmosphere } from "@/scene/AtmosphereLayer";
import { type EmitterHandle, registerEmitter } from "@/scene/emitters.js";
import { ASPECT_GLASS, RoseWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import h from "./hero.module.css";
import type { NaveSpec } from "./ink";
import {
	type Box,
	HeroMark,
	HeroPitch,
	HeroPlay,
	HeroQr,
	HeroScroll,
	Motes,
	NaveImage,
	Shafts,
	useBox,
	useLayer,
	useNave,
	useOnScreen,
	useParallax,
} from "./shared";

const BLEED = 40;
/** Seconds for one full turn (each mask is at the top for about twelve of them). */
const TURN_S = 84;
/** Clockwise from the top: Echo first, so the still rose shows it. */
const RING = [2, 0, 1, 3, 4, 5, 6] as const;
const STEP = 360 / RING.length;

function layout({ w, h: hh }: Box) {
	const vw = w - BLEED * 2;
	const vh = hh - BLEED * 2;
	const portrait = vw / vh < 0.85;
	const r = portrait
		? Math.min(vw * 0.6, vh * 0.3)
		: Math.min(vh * 0.42, vw * 0.28);
	const cy = BLEED + (portrait ? vh * 0.29 : vh * 0.43);
	const cx = w / 2;
	const floor = Math.min(hh - BLEED - vh * 0.12, cy + r * 1.08);
	return { r, cx, cy, floor, portrait };
}

export function HeroRose() {
	const heroRef = useRef<HTMLElement>(null);
	const sceneRef = useRef<HTMLDivElement>(null);
	const roseRef = useRef<HTMLDivElement>(null);
	const box = useBox(sceneRef);
	const p = useParallax();
	const onScreen = useOnScreen(heroRef);
	const [rays, setRays] = useState(false);
	const lay = useMemo(() => (box ? layout(box) : null), [box]);

	// ---- the turn: one motion value drives the wheel; the masks counter-turn to stay upright ----
	const rot = useMotionValue(0);
	const upright = useTransform(rot, (r) => -r);
	const [top, setTop] = useState(0);
	useMotionValueEvent(rot, "change", (r) => {
		const i =
			(((Math.round(-r / STEP) % RING.length) + RING.length) % RING.length) | 0;
		setTop((t) => (t === i ? t : i));
	});
	useEffect(() => {
		if (p.reduce || !onScreen) return;
		const from = rot.get() % 360;
		rot.set(from);
		const a = animate(rot, from + 360, {
			duration: TURN_S,
			ease: "linear",
			repeat: Number.POSITIVE_INFINITY,
		});
		return () => a.stop();
	}, [p.reduce, onScreen, rot]);

	const aspect = RING[top] ?? 2;
	const info = Lx.aspects[aspect] ?? Lx.aspects[2];
	const tint = (ASPECT_GLASS[aspect] ?? ASPECT_GLASS[2])[0];

	// ---- the rose lights the atmosphere like any glass ----
	const emit = useRef<EmitterHandle | null>(null);
	const tintRef = useRef(tint);
	tintRef.current = tint;
	const hasLay = !!lay;
	useEffect(() => {
		const el = roseRef.current;
		if (!el || !hasLay) return;
		const hnd = registerEmitter({
			kind: "glass",
			anchor: el,
			color: tintRef.current,
		});
		emit.current = hnd;
		return () => {
			hnd.remove();
			emit.current = null;
		};
	}, [hasLay]);
	useEffect(() => {
		emit.current?.update({ color: tint });
	}, [tint]);

	const spec: NaveSpec | null =
		box && lay
			? {
					w: box.w,
					h: box.h,
					floor: lay.floor,
					holes: [{ kind: "rose", cx: lay.cx, cy: lay.cy, r: lay.r }],
					piers: lay.portrait
						? []
						: [lay.cx - lay.r * 1.75, lay.cx + lay.r * 1.75],
					focus: [lay.cx, lay.cy + lay.r * 0.4],
					seed: 4127,
				}
			: null;
	const nave = useNave(spec);
	const scene = useLayer(p, 12, 0.3);
	const dust = useLayer(p, 30, 0.16);
	const words = useLayer(p, -5, 0);
	const maskSize = lay ? Math.round(lay.r * 0.3) : 0;

	return (
		<header ref={heroRef} className={h.hero}>
			<motion.div
				ref={sceneRef}
				className={h.scene}
				style={{ inset: -BLEED, ...scene }}
				aria-hidden="true"
			>
				{box && lay ? (
					<>
						<NaveImage src={nave} box={box} />
						{!rays && (
							<Shafts
								box={box}
								floor={lay.floor}
								reduce={p.reduce}
								from={[[lay.cx - lay.r * 0.75, lay.cx + lay.r * 0.75, lay.cy]]}
							/>
						)}
						<div
							ref={roseRef}
							className={h.rose}
							style={{
								left: lay.cx - lay.r,
								top: lay.cy - lay.r,
								width: lay.r * 2,
								height: lay.r * 2,
							}}
						>
							<motion.div className={h.roseTurn} style={{ rotate: rot }}>
								<RoseWindow aspect={aspect} />
								{RING.map((a, i) => {
									const t = ((i * STEP - 90) * Math.PI) / 180;
									const rr = lay.r * 0.6;
									const lit = i === top;
									return (
										<motion.div
											key={a}
											className={h.roseMask}
											style={{
												left: lay.r + rr * Math.cos(t) - maskSize / 2,
												top: lay.r + rr * Math.sin(t) - maskSize / 2,
												width: maskSize,
												rotate: upright,
											}}
											animate={{
												scale: lit ? 1.18 : 1,
												opacity: lit ? 1 : 0.82,
											}}
											transition={{ duration: 1.2 }}
										>
											<Mask aspect={a} size={maskSize} glow={lit} />
										</motion.div>
									);
								})}
							</motion.div>
						</div>
						<Atmosphere
							preset="balanced"
							floor={lay.floor / box.h}
							lean={0.05}
							onLight={setRays}
						/>
					</>
				) : null}
			</motion.div>
			{box && lay && !rays && !p.reduce ? (
				<motion.div
					className={h.scene}
					style={{ inset: -BLEED, ...dust }}
					aria-hidden="true"
				>
					<Motes
						box={box}
						n={24}
						seed={11}
						region={[
							lay.cx - lay.r * 1.2,
							lay.cy,
							lay.r * 2.4,
							lay.floor - lay.cy + 60,
						]}
					/>
				</motion.div>
			) : null}
			<p className={h.srOnly}>{L.hero.rose.aria}</p>
			<div className={h.pool} aria-hidden="true" />
			<motion.div className={h.roseWords} style={words}>
				<HeroMark className={h.roseMark} />
				<p className={h.temper} aria-live="off">
					<span className={h.temperKick}>{L.hero.rose.kicker}</span>
					<motion.span
						key={aspect}
						className={h.temperLine}
						initial={p.reduce ? false : { opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
						<b>{info.name}:</b> {info.blurb}
					</motion.span>
				</p>
				<HeroPitch />
				<HeroPlay />
			</motion.div>
			<HeroQr className={h.qrCorner} />
			<HeroScroll />
		</header>
	);
}
