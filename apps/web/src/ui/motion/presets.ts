/**
 * Shared motion vocabulary for every screen (motion/react).
 *
 * The house feel: things are heavy and inked. Entrances overshoot a little and
 * settle hard (a slab dropped on stone), exits are quick and fall away. Nothing
 * floats. Impacts get hit-stop + shake + haptic, see ./impact.ts.
 */
import type { Transition, Variants } from "motion/react";

// ---------------------------------------------------------------- easings
/** Expo-out: the default for anything arriving. Matches --ease-out in CSS. */
export const easeOut = [0.16, 1, 0.3, 1] as const;
/** Accelerating fall, for things leaving or about to strike. */
export const easeIn = [0.7, 0, 0.84, 0] as const;
/** Symmetric, for loops (breathing glows, candle flicker). */
export const easeInOut = [0.65, 0, 0.35, 1] as const;

// ---------------------------------------------------------------- durations (seconds)
export const dur = {
	instant: 0.08,
	fast: 0.16,
	base: 0.28,
	slow: 0.5,
	linger: 0.9,
} as const;

// ---------------------------------------------------------------- springs
export const spring = {
	/** Taps, toggles, chips: immediate, no wobble. */
	snappy: { type: "spring", stiffness: 620, damping: 38, mass: 0.7 },
	/** Cards, plates arriving: settles with one small overshoot. */
	settle: { type: "spring", stiffness: 340, damping: 26, mass: 0.9 },
	/** Bottom sheets and drawers: firm, no bounce at rest. */
	sheet: { type: "spring", stiffness: 420, damping: 42, mass: 1 },
	/** Big lettering landing: heavy, visible overshoot. */
	slam: { type: "spring", stiffness: 760, damping: 16, mass: 1.15 },
	/** Pressed state on buttons. */
	press: { type: "spring", stiffness: 900, damping: 40, mass: 0.5 },
	/** Slow drift for ambient UI (never for feedback). */
	soft: { type: "spring", stiffness: 140, damping: 22, mass: 1 },
} as const satisfies Record<string, Transition>;

export const tween = {
	in: { duration: dur.base, ease: easeOut },
	out: { duration: dur.fast, ease: easeIn },
	fade: { duration: dur.base, ease: "linear" },
} as const satisfies Record<string, Transition>;

// ---------------------------------------------------------------- stagger
/** Parent transition that staggers its variant children. */
export function staggerIn(step = 0.06, delay = 0): Transition {
	return { staggerChildren: step, delayChildren: delay };
}

/** Parent variants: put on a list, give children `rise` (or any) variants. */
export function listVariants(step = 0.06, delay = 0): Variants {
	return {
		hidden: {},
		shown: { transition: staggerIn(step, delay) },
		gone: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
	};
}

// ---------------------------------------------------------------- enter / exit variants
// All use the labels hidden -> shown -> gone, so they compose under one parent.

/** Generic item in a list: rises out of the ink. */
export const rise: Variants = {
	hidden: { opacity: 0, y: 14, filter: "blur(3px)" },
	shown: {
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
		transition: { ...spring.settle, opacity: tween.in, filter: tween.in },
	},
	gone: { opacity: 0, y: -6, transition: tween.out },
};

/** Cards and plates: drop in with weight. */
export const card: Variants = {
	hidden: { opacity: 0, y: 22, scale: 0.96, rotate: -0.6 },
	shown: {
		opacity: 1,
		y: 0,
		scale: 1,
		rotate: 0,
		transition: { ...spring.settle, opacity: { duration: dur.fast } },
	},
	gone: { opacity: 0, y: 10, scale: 0.97, transition: tween.out },
};

/** Bottom sheet: slides from below the tab bar. Pair with `scrim`. */
export const sheet: Variants = {
	hidden: { y: "100%" },
	shown: { y: 0, transition: spring.sheet },
	gone: { y: "100%", transition: { duration: 0.22, ease: easeIn } },
};

/** Backdrop behind sheets and modals. */
export const scrim: Variants = {
	hidden: { opacity: 0 },
	shown: { opacity: 1, transition: { duration: dur.base } },
	gone: { opacity: 0, transition: { duration: dur.fast } },
};

/** Centre-screen pop (dialogs, rewards). */
export const pop: Variants = {
	hidden: { opacity: 0, scale: 0.86 },
	shown: {
		opacity: 1,
		scale: 1,
		transition: { ...spring.settle, opacity: { duration: dur.fast } },
	},
	gone: { opacity: 0, scale: 0.94, transition: tween.out },
};

/** Plain fade (screen swaps under a tab change). */
export const fade: Variants = {
	hidden: { opacity: 0 },
	shown: { opacity: 1, transition: { duration: dur.base, ease: easeOut } },
	gone: { opacity: 0, transition: { duration: dur.fast } },
};

/** Screen-to-screen swap: short lateral drift, keyed by tab index direction. */
export const screenSwap: Variants = {
	hidden: (dir: number = 1) => ({ opacity: 0, x: 24 * dir }),
	shown: { opacity: 1, x: 0, transition: tween.in },
	gone: (dir: number = 1) => ({
		opacity: 0,
		x: -16 * dir,
		transition: tween.out,
	}),
};

/** Spread onto a motion element: `<motion.div {...enter(card)}>`. */
export function enter(variants: Variants) {
	return {
		variants,
		initial: "hidden",
		animate: "shown",
		exit: "gone",
	} as const;
}

// ---------------------------------------------------------------- press feedback
/** Spread onto motion.button: `<motion.button {...pressable}>`. */
export const pressable = {
	whileTap: { scale: 0.96, y: 2 },
	transition: spring.press,
} as const;

/** Lighter press for small chips and icon tabs. */
export const pressableSoft = {
	whileTap: { scale: 0.92 },
	transition: spring.press,
} as const;
