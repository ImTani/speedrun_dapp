"use client";

/**
 * Slam: the big outcome lettering ("Old Marrow devours").
 *
 * Arrives oversized and blurred, strikes (fires onImpact: hook your shake /
 * hit-stop / flash there), overshoots on a heavy spring, an ink pool spreads
 * beneath it and a burst of its own light bleeds off. Then the sub lines rise
 * one by one. Remount with a new `key` (or change `text`) to replay.
 *
 * Every string is passed in: take them from the lexicon.
 */
import { stagger, useAnimate, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useEffectEvent, useMemo } from "react";
import { easeIn, easeOut, spring } from "../motion/presets";
import s from "./type.module.css";

export type SlamTone = "devour" | "kindle" | "neutral";

export type SlamProps = {
	text: string;
	/** One string, or several lines revealed in turn (the 2nd onward set brighter). */
	sub?: string | readonly string[];
	/** Small rubric above the lettering (e.g. which toll). */
	kicker?: string;
	/**
	 * Words inside `text` to set apart from the tone (the names in "Old Marrow devours Gallow"):
	 * drawn in the --slam-name-* colours, so the names read first and the tone carries the verb.
	 */
	names?: readonly string[];
	tone?: SlamTone;
	/** Seconds before the strike begins. */
	delay?: number;
	/** Fires the instant the lettering lands. */
	onImpact?: () => void;
	/** Fires once the sub lines have settled. */
	onDone?: () => void;
	/** Announce to screen readers when it plays. Default true. */
	live?: boolean;
	className?: string;
};

/** Break into at most two balanced lines so long names stay big. */
export function slamLines(text: string): string[] {
	const t = text.trim().replace(/\s+/g, " ");
	if (t.length <= 11 || !t.includes(" ")) return [t];
	const mid = t.length / 2;
	let best = -1;
	for (let i = 0; i < t.length; i++) {
		if (t[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid)))
			best = i;
	}
	return [t.slice(0, best), t.slice(best + 1)];
}

/** Character ranges of `names` in `t`, in order, each searched after the previous one. */
function nameRanges(t: string, names: readonly string[]): [number, number][] {
	const out: [number, number][] = [];
	let from = 0;
	for (const raw of names) {
		const n = raw.trim().replace(/\s+/g, " ");
		if (!n) continue;
		const at = t.indexOf(n, from);
		if (at < 0) continue;
		out.push([at, at + n.length]);
		from = at + n.length;
	}
	return out;
}

/** A line cut into runs: [text, isName]. `start` is the line's offset in the whole text. */
function runsOf(
	line: string,
	start: number,
	ranges: readonly [number, number][],
): [string, boolean][] {
	if (!ranges.length) return [[line, false]];
	const runs: [string, boolean][] = [];
	let cur = "",
		curName = false;
	for (let i = 0; i < line.length; i++) {
		const at = start + i;
		const isName = ranges.some(([a, b]) => at >= a && at < b);
		if (i > 0 && isName !== curName) {
			runs.push([cur, curName]);
			cur = "";
		}
		curName = isName;
		cur += line[i];
	}
	runs.push([cur, curName]);
	return runs;
}

export function Slam({
	text,
	sub,
	kicker,
	names,
	tone = "neutral",
	delay = 0,
	onImpact,
	onDone,
	live = true,
	className,
}: SlamProps) {
	const [scope, animate] = useAnimate<HTMLDivElement>();
	const reduce = useReducedMotion();
	const lines = useMemo(() => slamLines(text), [text]);
	const nameKey = names?.join("\u0001") ?? "";
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the names' text
	const runs = useMemo(() => {
		const t = text.trim().replace(/\s+/g, " ");
		const ranges = nameRanges(t, names ?? []);
		let start = 0;
		return lines.map((l) => {
			const r = runsOf(l, start, ranges);
			start += l.length + 1;
			return r;
		});
	}, [lines, text, nameKey]);
	const subs = useMemo(
		() => (sub == null ? [] : typeof sub === "string" ? [sub] : [...sub]),
		[sub],
	);
	const subKey = subs.join("\u0001");
	const longest = Math.max(...lines.map((l) => l.length), 4);

	// Latest callbacks, without replaying the slam when they change.
	const fireImpact = useEffectEvent(() => onImpact?.());
	const fireDone = useEffectEvent(() => onDone?.());

	// biome-ignore lint/correctness/useExhaustiveDependencies: replay only when the words change
	useEffect(() => {
		const root = scope.current;
		if (!root) return;
		let dead = false;
		const q = (part: string) =>
			root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`);
		const word = q("word")[0];
		const blot = q("blot")[0];
		const bleed = q("bleed")[0];
		const kick = q("kicker")[0];
		const subLines = q("sub");
		if (!word || !blot || !bleed) return;

		if (reduce) {
			for (const el of [word, blot, ...subLines]) el.style.opacity = "1";
			blot.style.transform = "none";
			if (kick) kick.style.opacity = "1";
			fireImpact();
			fireDone();
			return;
		}

		(async () => {
			if (kick)
				animate(
					kick,
					{ opacity: [0, 1], y: [-6, 0] },
					{ duration: 0.24, delay, ease: easeOut },
				);
			// The strike: falls in from huge and out of focus, accelerating.
			await animate(
				word,
				{
					opacity: [0, 1],
					scale: [2.5, 0.92],
					filter: ["blur(12px)", "blur(0px)"],
				},
				{
					duration: 0.17,
					delay: delay + 0.06,
					ease: easeIn,
					// Visible for the whole fall, not just its last frames.
					opacity: { duration: 0.07, delay: delay + 0.06, ease: "linear" },
				},
			);
			if (dead) return;
			fireImpact();
			animate(
				blot,
				{ opacity: [0, 1], scale: [0.45, 1.08, 1] },
				{ duration: 0.5, ease: easeOut },
			);
			animate(
				bleed,
				{
					opacity: [0.95, 0],
					scale: [1, 1.32],
					filter: ["blur(0px)", "blur(14px)"],
				},
				{ duration: 0.6, ease: easeOut },
			);
			// velocity 0: motion would otherwise carry the fall's speed into the
			// spring and overshoot through zero (the lettering flips).
			animate(word, { scale: 1 }, { ...spring.slam, velocity: 0 });
			if (subLines.length) {
				await animate(
					subLines,
					{
						opacity: [0, 1],
						y: [10, 0],
						filter: ["blur(5px)", "blur(0px)"],
					},
					{
						duration: 0.42,
						ease: easeOut,
						delay: stagger(0.42, { startDelay: 0.22 }),
					},
				);
			} else {
				await new Promise((r) => setTimeout(r, 260));
			}
			if (!dead) fireDone();
		})();

		return () => {
			dead = true;
		};
	}, [text, subKey, kicker, delay, reduce]);

	const lettering = runs.map((line, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
		<span key={i} className={s.line}>
			{line.map(([chunk, isName], j) =>
				isName ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: runs are positional
					<span key={j} className={s.name}>
						{chunk}
					</span>
				) : (
					chunk
				),
			)}
		</span>
	));

	return (
		<div
			ref={scope}
			className={className ? `${s.slam} ${className}` : s.slam}
			data-tone={tone}
			role={live ? "status" : undefined}
			aria-live={live ? "polite" : undefined}
			style={{ "--slam-len": longest } as CSSProperties}
		>
			<div className={s.blot} data-part="blot" aria-hidden="true" />
			{kicker ? (
				<p className={s.slamKicker} data-part="kicker">
					{kicker}
				</p>
			) : null}
			<div className={s.word} data-part="word">
				<span className={s.under} aria-hidden="true">
					{lettering}
				</span>
				<span className={s.face}>{lettering}</span>
				<span className={s.bleed} data-part="bleed" aria-hidden="true">
					{lettering}
				</span>
			</div>
			{subs.length ? (
				<p className={s.sub}>
					{subs.map((line, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
						<span key={i} className={s.subLine} data-part="sub">
							{line}
						</span>
					))}
				</p>
			) : null}
		</div>
	);
}
