"use client";

/**
 * Hero A, The Nave: a wide nave in ink, three tall lit windows on its end wall (Mercy's gold,
 * Echo's blue, Hunger's blood), light falling to the flagstones, dust in the beams, and the
 * name struck large in the middle of the floor. Slow parallax on the pointer and on scroll.
 *
 * One WebGL context: the three windows, the centre window's caustics and the atmosphere all
 * draw through the shared lens (src/scene/lens.js). Reduced motion: still light, no drift.
 */
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { Atmosphere } from "@/scene/AtmosphereLayer";
import { GlassWindow } from "@/ui/GlassWindow";
import h from "./hero.module.css";
import { type ArchHole, archH, type NaveSpec } from "./ink";
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
	useParallax,
} from "./shared";

/** The scene overhangs the hero by this much on every side, so parallax never shows an edge. */
const BLEED = 48;

/** Left, centre, right: which Aspect stands in each window. */
const ASPECTS = [0, 2, 1] as const;

type Win = ArchHole & { aspect: number };

function layout({ w, h: hh }: Box) {
	const vw = w - BLEED * 2;
	const vh = hh - BLEED * 2;
	const portrait = vw / vh < 0.85;
	const mid = w / 2;
	let wins: Win[];
	let piers: number[];
	if (portrait) {
		const cw = Math.min(vw * 0.46, vh * 0.24);
		const sw = cw * 0.66;
		const top = BLEED + vh * 0.075;
		const sTop = top + (archH(cw) - archH(sw)) * 0.55;
		const off = mid - (BLEED + vw * 0.02);
		wins = [
			{ kind: "arch", cx: mid - off, top: sTop, w: sw, aspect: ASPECTS[0] },
			{ kind: "arch", cx: mid, top, w: cw, aspect: ASPECTS[1] },
			{ kind: "arch", cx: mid + off, top: sTop, w: sw, aspect: ASPECTS[2] },
		];
		piers = [];
	} else {
		const cw = Math.min(vh * 0.58 * (300 / 420), vw * 0.24);
		const sw = cw * 0.82;
		const top = BLEED + vh * 0.07;
		const sTop = top + (archH(cw) - archH(sw)) * 0.6;
		const off = Math.max(cw / 2 + sw / 2 + vw * 0.07, vw * 0.3);
		wins = [
			{ kind: "arch", cx: mid - off, top: sTop, w: sw, aspect: ASPECTS[0] },
			{ kind: "arch", cx: mid, top, w: cw, aspect: ASPECTS[1] },
			{ kind: "arch", cx: mid + off, top: sTop, w: sw, aspect: ASPECTS[2] },
		];
		piers = [mid - off * 1.5, mid - off / 2, mid + off / 2, mid + off * 1.5];
	}
	const centre = wins[1] as Win;
	const bottom = Math.max(...wins.map((x) => x.top + archH(x.w)));
	const floor = bottom + vh * (portrait ? 0.05 : 0.045);
	return { wins, piers, floor, centre, portrait };
}

export function HeroNave() {
	const sceneRef = useRef<HTMLDivElement>(null);
	const causticRef = useRef<HTMLCanvasElement>(null);
	const box = useBox(sceneRef);
	const p = useParallax();
	const [rays, setRays] = useState(false);
	const lay = useMemo(() => (box ? layout(box) : null), [box]);
	const spec: NaveSpec | null =
		box && lay
			? {
					w: box.w,
					h: box.h,
					floor: lay.floor,
					holes: lay.wins.map(({ kind, cx, top, w }) => ({ kind, cx, top, w })),
					piers: lay.piers,
					focus: [box.w / 2, lay.centre.top + archH(lay.centre.w) * 0.7],
					seed: 2207,
				}
			: null;
	const nave = useNave(spec);
	const scene = useLayer(p, 10, 0.32);
	const dust = useLayer(p, 28, 0.18);
	const words = useLayer(p, -5, 0);

	return (
		<header className={h.hero}>
			<motion.div
				ref={sceneRef}
				className={h.scene}
				style={{ inset: -BLEED, ...scene }}
				aria-hidden="true"
			>
				{box && lay ? (
					<>
						<NaveImage src={nave} box={box} />
						<canvas ref={causticRef} className={h.caustic} />
						{lay.wins.map((win, i) => (
							<GlassWindow
								key={win.aspect}
								aspect={win.aspect}
								width={Math.round(win.w)}
								{...(i === 1 ? { caustics: causticRef } : {})}
								style={{
									position: "absolute",
									left: win.cx - win.w / 2,
									top: win.top,
								}}
							/>
						))}
						{!rays && (
							<Shafts
								box={box}
								floor={lay.floor}
								reduce={p.reduce}
								from={lay.wins.map(
									(x) =>
										[
											x.cx - x.w / 2,
											x.cx + x.w / 2,
											x.top + x.w * 0.6,
										] as const,
								)}
							/>
						)}
					</>
				) : null}
				{box && lay ? (
					<Atmosphere
						preset="balanced"
						floor={lay.floor / box.h}
						lean={0.1}
						onLight={setRays}
					/>
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
						n={28}
						region={[
							lay.centre.cx - box.w * 0.4,
							lay.centre.top + lay.centre.w * 0.4,
							box.w * 0.8,
							lay.floor - lay.centre.top,
						]}
					/>
				</motion.div>
			) : null}
			<div className={h.pool} aria-hidden="true" />
			<motion.div className={h.naveWords} style={words}>
				<HeroMark className={h.naveMark} />
				<HeroPitch />
				<HeroPlay />
			</motion.div>
			<HeroQr className={h.qrCorner} />
			<HeroScroll />
		</header>
	);
}
