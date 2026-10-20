"use client";

/**
 * Juice for impacts: hit-stop, screen shake, haptics.
 *
 *   const shake = useShake<HTMLDivElement>();
 *   <div ref={shake.ref}>...the thing that trembles...</div>
 *   await impact(shake, { stop: 120, amp: 12 });
 *
 * Put the shake ref on a WRAPPER, not on an element that animates its own
 * transform (shake writes x / y / rotate on the element it owns).
 */
import {
	type AnimationPlaybackControls,
	animate,
	useReducedMotion,
} from "motion/react";
import { type RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { buzz as vibrate } from "@/audio/haptics";

export type ShakeOptions = {
	/** Peak offset in px. 6 = nudge, 12 = blow, 20 = catastrophe. */
	amp?: number;
	/** Seconds. */
	duration?: number;
	/** Peak rotation in degrees. */
	twist?: number;
	/** Number of jolts; more = buzzier. */
	steps?: number;
};

export type Shaker<T extends Element> = {
	ref: RefObject<T | null>;
	shake: (opts?: ShakeOptions) => Promise<void>;
};

/** Decaying random-walk shake on the element behind `ref`. */
export function useShake<T extends Element = HTMLDivElement>(): Shaker<T> {
	const ref = useRef<T | null>(null);
	const running = useRef<AnimationPlaybackControls | null>(null);
	const reduce = useReducedMotion();

	useEffect(() => () => running.current?.stop(), []);

	const shake = useCallback(
		async ({
			amp = 10,
			duration = 0.34,
			twist = 0.8,
			steps = 9,
		}: ShakeOptions = {}) => {
			const el = ref.current;
			if (!el) return;
			running.current?.stop();
			// Reduced motion: a single small nudge instead of a tremor.
			const a = reduce ? Math.min(amp, 3) : amp;
			const n = reduce ? 2 : steps;
			const xs: number[] = [0];
			const ys: number[] = [0];
			const rs: number[] = [0];
			let sign = Math.random() < 0.5 ? -1 : 1;
			for (let i = 1; i < n; i++) {
				const fall = (1 - i / n) ** 1.6;
				sign = -sign;
				xs.push(sign * a * fall * (0.6 + Math.random() * 0.4));
				ys.push((Math.random() * 2 - 1) * a * 0.55 * fall);
				rs.push(reduce ? 0 : (Math.random() * 2 - 1) * twist * fall);
			}
			xs.push(0);
			ys.push(0);
			rs.push(0);
			const ctl = animate(
				el,
				{ x: xs, y: ys, rotate: rs },
				{ duration: reduce ? 0.12 : duration, ease: "linear" },
			);
			running.current = ctl;
			await ctl;
		},
		[reduce],
	);

	return useMemo(() => ({ ref, shake }), [shake]);
}

/**
 * Hit-stop: freeze the given animations for `ms`, then let them run on.
 * With no controls it is just a precise pause inside an async sequence.
 */
export function hitStop(
	ms: number,
	...controls: (AnimationPlaybackControls | null | undefined)[]
): Promise<void> {
	const live = controls.filter((c): c is AnimationPlaybackControls => !!c);
	for (const c of live) c.pause();
	return new Promise((resolve) => {
		setTimeout(() => {
			for (const c of live) c.play();
			resolve();
		}, ms);
	});
}

/** Phone buzz where supported (Android Chrome); silently nothing elsewhere. Goes through
 * @/audio/haptics so it respects the player's Vibration switch. */
export function haptic(pattern: number | number[] = 14): void {
	vibrate(pattern);
}

export type ImpactOptions = ShakeOptions & {
	/** Hit-stop length in ms before the shake releases. 0 = none. */
	stop?: number;
	/** Vibration pattern; false for none. */
	buzz?: number | number[] | false;
	/** Animations to freeze during the hit-stop. */
	freeze?: (AnimationPlaybackControls | null | undefined)[];
};

/** The full beat: buzz + freeze-frame, then shake on release. */
export async function impact(
	shaker: Pick<Shaker<Element>, "shake"> | null,
	{ stop = 110, buzz = [22], freeze = [], ...shake }: ImpactOptions = {},
): Promise<void> {
	if (buzz !== false) haptic(buzz);
	if (stop > 0) await hitStop(stop, ...freeze);
	await shaker?.shake(shake);
}

/** Impact presets so every screen hits with the same weight. */
export const IMPACT = {
	tap: { stop: 0, amp: 3, duration: 0.16, buzz: 8 },
	kindle: { stop: 70, amp: 5, duration: 0.3, twist: 0.3, buzz: [10] },
	devour: {
		stop: 140,
		amp: 13,
		duration: 0.42,
		twist: 1.1,
		buzz: [26, 30, 14],
	},
	ruin: { stop: 180, amp: 18, duration: 0.55, twist: 1.6, buzz: [34, 40, 24] },
} as const satisfies Record<string, ImpactOptions>;
