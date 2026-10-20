"use client";

// The verdict slammed over the floor, and the medallions of Light that fly into each tally.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { FX, fx } from "@/fx";
import { gathering as T } from "@/lexicon/gathering.ts";
import { easeIn, tween } from "@/ui/motion";
import { Slam } from "@/ui/type";
import css from "./gathering.module.css";
import type { Duel, SideKey } from "./model.ts";

export function Verdict({
	duel,
	show,
	again = 0,
	top,
	bottom,
	onImpact,
}: {
	duel: Duel | null;
	show: boolean;
	/** Bump to strike the same verdict again (type tuning). */
	again?: number;
	/** The open floor, in box px from the top and from the bottom. */
	top: number;
	bottom: number;
	/** Fires as the lettering lands, with the duel it spells. */
	onImpact: (duel: Duel) => void;
}) {
	return (
		<div className={css.verdict} style={{ top, bottom }}>
			<AnimatePresence>
				{show && duel && (
					<motion.div
						key={`${duel.key}#${again}`}
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
							sub={duel.sub ? [duel.sub] : []}
							kicker={T.verdictKicker(duel.toll)}
							names={
								duel.dev === "B"
									? [duel.b.name, duel.a.name]
									: [duel.a.name, duel.b.name]
							}
							tone={
								duel.silent
									? "neutral"
									: duel.kind === "kindle"
										? "kindle"
										: "devour"
							}
							onImpact={() => onImpact(duel)}
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
	/** Its place in its side's flight (for the rising ding). */
	i: number;
	from: [number, number];
	to: [number, number];
	delay: number;
	dur: number;
}

/**
 * One medallion per point of Light, flying into its Fragment's tally in time with the medallion
 * ring lighting around the window. A devourer's Light is torn out of its victim's window; shared
 * Light rises from the floor between them. Flown on the shared particle layer when it is live
 * (one canvas, pooled), else as DOM medallions; each landing ticks the tally (onLand).
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
	/** One point of Light landed: the side, and its place in that side's flight (-1: no ding). */
	onLand: (side: SideKey, i: number) => void;
}) {
	const reduce = useReducedMotion();
	const [flyers, setFlyers] = useState<Flyer[]>([]);
	const launched = useRef("");
	const landRef = useRef(onLand);
	landRef.current = onLand;
	// Motes still in the air when the next duel takes the stage must not tick its tallies.
	const liveKey = useRef("");
	liveKey.current = duel?.key ?? "";

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
				// No flight: the tally fills at once, with one ding for the lot.
				for (let i = 0; i < n; i++) landRef.current(k, i === n - 1 ? 0 : -1);
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
			const tally = tallyRefs[k].current;
			if (fx.enabled && tally && root) {
				// Torn out of the victim's glass, or risen from the floor; into the coin on the plate.
				const pane = vic
					? rootRef.current?.querySelector(`[data-window="${vic}"]`)
					: null;
				const src = pane ?? {
					x: root.left + from[0],
					y: root.top + from[1],
				};
				const key = duel.key;
				void fx.stream(src, tally.querySelector("i") ?? tally, {
					count: n,
					color: vic ? FX.giltHi : FX.gilt,
					duration: dur,
					stagger: n > 1 ? Math.max(0.03, (spread - dur) / (n - 1)) : 0,
					size: 3.6,
					onArrive: (i) => {
						if (liveKey.current === key) landRef.current(k, i);
					},
				});
				continue;
			}
			for (let i = 0; i < n; i++) {
				const land = ((i + 1) / n) * spread;
				out.push({
					id: `${duel.key}${k}${i}`,
					side: k,
					i,
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
							landRef.current(f.side, f.i);
						}}
					>
						<i className={css.coin} style={{ display: "block" }} />
					</motion.span>
				);
			})}
		</div>
	);
}
