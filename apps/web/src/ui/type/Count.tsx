"use client";

/**
 * Count: a number that rolls to its new value (Light, tolls, standings).
 * On change it rolls, the numeral kicks, and a +n / -n ghost floats off in
 * gilt (gain) or blood (loss).
 *
 *   <Count value={light} unit={L.light} size="lg" />
 *   <Count value={ash} tick="ash" />   // a rising tick per step while it climbs
 *
 * Leave `tick` unset where the number moves on its own (polls): only rises the player
 * caused should sound.
 */
import {
	AnimatePresence,
	animate,
	motion,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { type Cue, series } from "@/audio";
import { easeOut } from "../motion/presets";
import s from "./type.module.css";

export type CountProps = {
	value: number;
	/** Start the first roll from here (e.g. 0 on a reveal). Default: no roll. */
	from?: number;
	/** Roll length in seconds; default scales with the size of the change. */
	duration?: number;
	tone?: "gilt" | "bone" | "blood";
	size?: "sm" | "md" | "lg" | "xl";
	/** Small italic word after the number (from the lexicon). */
	unit?: string;
	/** Float a +n / -n ghost on change. Default true. */
	showDelta?: boolean;
	format?: (n: number) => string;
	/** Cue ticked (up to 14 rising hits, spread over the roll) when the value rises. */
	tick?: Cue | undefined;
	className?: string;
};

const MINUS = "−";
const plain = (n: number) => n.toLocaleString("en-US");

function rollTime(diff: number) {
	return Math.min(1.5, 0.4 + Math.log10(1 + Math.abs(diff)) * 0.4);
}

export function Count({
	value,
	from,
	duration,
	tone = "gilt",
	size = "md",
	unit,
	showDelta = true,
	format = plain,
	tick,
	className,
}: CountProps) {
	const reduce = useReducedMotion();
	const mv = useMotionValue(from ?? value);
	const shown = useTransform(mv, (v) => format(Math.round(v)));
	const numRef = useRef<HTMLSpanElement>(null);
	const prev = useRef(from ?? value);
	const [ghosts, setGhosts] = useState<{ id: number; d: number }[]>([]);
	const seq = useRef(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: roll only when the value moves
	useEffect(() => {
		const d = value - prev.current;
		prev.current = value;
		// Compare against the live value, not prev: survives StrictMode's
		// effect replay and interrupted rolls.
		if (mv.get() === value) return;
		if (tick && d > 0) {
			const n = Math.min(14, d);
			const ms = (reduce ? 0.4 : (duration ?? rollTime(d))) * 1000;
			series(tick, n, { every: Math.max(36, Math.min(110, (ms * 0.8) / n)) });
		}
		if (reduce) {
			mv.set(value);
			return;
		}
		const roll = animate(mv, value, {
			duration: duration ?? rollTime(value - mv.get()),
			ease: easeOut,
		});
		const el = numRef.current;
		const kick = el
			? animate(
					el,
					{ scale: [1.22, 1], filter: ["brightness(1.7)", "brightness(1)"] },
					{ duration: 0.45, ease: easeOut },
				)
			: null;
		if (showDelta && d !== 0) {
			const id = ++seq.current;
			setGhosts((g) => [...g.slice(-2), { id, d }]);
			setTimeout(() => setGhosts((g) => g.filter((x) => x.id !== id)), 1300);
		}
		return () => {
			roll.stop();
			kick?.stop();
		};
	}, [value]);

	return (
		<span
			className={className ? `${s.count} ${className}` : s.count}
			data-tone={tone}
			data-size={size}
		>
			<span className="sr-only" aria-live="polite">
				{format(value)}
				{unit ? ` ${unit}` : ""}
			</span>
			<motion.span ref={numRef} className={s.countNum} aria-hidden="true">
				{shown}
			</motion.span>
			{unit ? (
				<span className={s.countUnit} aria-hidden="true">
					{unit}
				</span>
			) : null}
			<AnimatePresence>
				{ghosts.map((g) => (
					<motion.span
						key={g.id}
						className={s.countDelta}
						data-sign={g.d > 0 ? "up" : "down"}
						aria-hidden="true"
						initial={{ opacity: 0, y: 6, scale: 0.8 }}
						animate={{ opacity: 1, y: -14, scale: 1 }}
						exit={{ opacity: 0, y: -30 }}
						transition={{ duration: 0.5, ease: easeOut }}
					>
						{g.d > 0 ? "+" : MINUS}
						{format(Math.abs(g.d))}
					</motion.span>
				))}
			</AnimatePresence>
		</span>
	);
}
