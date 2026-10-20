"use client";

/**
 * The one press feel for every control:
 *
 *   const press = usePress({ onClick, haptic: HAPTIC.tap, scale: 0.97 });
 *   <motion.button {...press}>...</motion.button>
 *
 *  - a spring scale while held (motion `whileTap`, the shared `spring.press`)
 *  - the tap sound: played by the shell's global click listener (src/screens/title/juice.ts),
 *    so no call here; `sfx` sets `data-sfx` ("off" for controls that play their own cue,
 *    or a cue name for a different one)
 *  - a light haptic on click, honouring the Vibration switch (`buzz`); `haptic={false}`
 *    when the handler buzzes its own pattern
 *  - `pressed` holds the pressed look (the review sheet only), via `data-pressed`
 */
import type { MouseEvent } from "react";
import type { Cue } from "@/audio/cues";
import { buzz, HAPTIC } from "@/audio/haptics";
import { spring } from "@/ui/motion/presets";

export type Haptic = number | readonly number[] | false;
export type Sfx = Cue | "off";

export type PressOptions<E extends Element> = {
	onClick?: ((e: MouseEvent<E>) => void) | undefined;
	haptic?: Haptic | undefined;
	sfx?: Sfx | undefined;
	/** Scale while held. Bars 0.97, tokens and chips 0.92, cards 0.985. */
	scale?: number | undefined;
	disabled?: boolean | undefined;
	pressed?: boolean | undefined;
};

export function usePress<E extends Element = HTMLButtonElement>({
	onClick,
	haptic,
	sfx,
	scale = 0.97,
	disabled,
	pressed,
}: PressOptions<E>) {
	const click = (e: MouseEvent<E>) => {
		if (haptic !== false) buzz(haptic ?? HAPTIC.tap);
		onClick?.(e);
	};
	return {
		onClick: click,
		...(disabled ? null : { whileTap: { scale } }),
		...(pressed ? { animate: { scale } } : null),
		transition: spring.press,
		"data-sfx": sfx,
		"data-pressed": pressed || undefined,
	};
}

/** Joins class names, dropping the empty ones. */
export const cx = (...c: (string | false | null | undefined)[]) =>
	c.filter(Boolean).join(" ");
