"use client";

// The verdict slammed over the floor, and the medallions of Light that fly into each tally.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { gathering as T } from "@/lexicon/gathering.ts";
import { easeIn, tween } from "@/ui/motion";
import { Slam } from "@/ui/type";
import css from "./gathering.module.css";
import type { Duel, SideKey } from "./model.ts";

export function Verdict({
	duel,
	show,
	top,
	bottom,
	onImpact,
}: {
	duel: Duel | null;
	show: boolean;
	/** The open floor, in box px from the top and from the bottom. */
	top: number;
	bottom: number;
	onImpact: () => void;
}) {
	return (
		<div className={css.verdict} style={{ top, bottom }}>
			<AnimatePresence>
				{show && duel && (
					<motion.div
						key={duel.key}
						style={{ width: "100%", display: "grid", justifyItems: "center" }}
						exit={{
							opacity: 0,
							y: -12,
							filter: "blur(4px)",
							transition: tween.out,
						}}
					>
						<Slam
							text={duel.verdict}
							sub={duel.sub}
							kicker={T.verdictKicker(duel.toll)}
							tone={
								duel.silent
									? "neutral"
									: duel.kind === "kindle"
										? "kindle"
										: "devour"
							}
							onImpact={onImpact}
						/>
						<span className="sr-only" aria-live="polite">
							{duel.gains}
						</span>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

interface Flyer {
	id: string;
	side: SideKey;
	from: [number, number];
	to: [number, number];
	delay: number;
	dur: number;
}

/**
 * One medallion per point of Light, flying into its Fragment's tally in time with the medallion
 * ring lighting around the window. A devourer's Light is torn out of its victim's plate; shared
 * Light rises from the floor between them.
 */
export function Flight({
	duel,
	active,
	span,
	rootRef,
	tallyRefs,
	floor,
	onLand,
}: {
	duel: Duel | null;
	/** True from the tally beat. */
	active: boolean;
	/** Seconds the tally lasts at the current pace. */
	span: number;
	rootRef: RefObject<HTMLDivElement | null>;
	tallyRefs: Record<SideKey, RefObject<HTMLSpanElement | null>>;
	/** Box point the shared Light rises from. */
	floor: [number, number];
	onLand: (side: SideKey) => void;
}) {
	const reduce = useReducedMotion();
	const [flyers, setFlyers] = useState<Flyer[]>([]);
	const launched = useRef("");
	const landRef = useRef(onLand);
	landRef.current = onLand;

	// biome-ignore lint/correctness/useExhaustiveDependencies: launch once per duel's tally
	useEffect(() => {
		if (!active || !duel || launched.current === duel.key) return;
		launched.current = duel.key;
		const root = rootRef.current?.getBoundingClientRect();
		const centre = (k: SideKey): [number, number] | null => {
			const r = tallyRefs[k].current?.getBoundingClientRect();
			if (!r || !root) return null;
			return [r.left - root.left + 18, r.top - root.top + r.height / 2];
		};
		const out: Flyer[] = [];
		for (const k of ["A", "B"] as SideKey[]) {
			const s = k === "A" ? duel.a : duel.b;
			const n = Math.min(12, s.gain);
			const to = centre(k);
			if (!n || !to) continue;
			if (reduce) {
				for (let i = 0; i < n; i++) landRef.current(k);
				continue;
			}
			const vic: SideKey | null =
				duel.kind === "devour" && duel.dev === k
					? k === "A"
						? "B"
						: "A"
					: null;
			const from = (vic && centre(vic)) || floor;
			const spread = Math.max(0.35, span * 0.64);
			const dur = Math.min(0.62, Math.max(0.32, spread / n + 0.22));
			for (let i = 0; i < n; i++) {
				const land = ((i + 1) / n) * spread;
				out.push({
					id: `${duel.key}${k}${i}`,
					side: k,
					from: [from[0] + (i % 3) * 6 - 6, from[1] + ((i * 7) % 5) - 2],
					to,
					delay: Math.max(0, land - dur),
					dur,
				});
			}
		}
		if (out.length) setFlyers((f) => [...f, ...out]);
	}, [active, duel?.key, reduce]);

	return (
		<div className={css.flight} aria-hidden="true">
			{flyers.map((f) => {
				const [x0, y0] = f.from,
					[x1, y1] = f.to;
				const peak = Math.min(y0, y1) - 46 - Math.abs(x1 - x0) * 0.12;
				return (
					<motion.span
						key={f.id}
						className={css.flyer}
						initial={{ x: x0, y: y0, scale: 0.3, opacity: 0 }}
						animate={{
							x: [x0, (x0 + x1) / 2, x1],
							y: [y0, peak, y1],
							scale: [0.3, 1.25, 0.7],
							opacity: [0, 1, 1],
						}}
						transition={{
							duration: f.dur,
							delay: f.delay,
							ease: easeIn,
							times: [0, 0.45, 1],
						}}
						onAnimationComplete={() => {
							setFlyers((all) => all.filter((x) => x.id !== f.id));
							landRef.current(f.side);
						}}
					>
						<i className={css.coin} style={{ display: "block" }} />
					</motion.span>
				);
			})}
		</div>
	);
}
