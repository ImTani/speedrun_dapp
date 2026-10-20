"use client";

/**
 * The quiet way out: Skip, Cancel, Credits, Keep my account, Got it. Gilt Cinzel small
 * caps, no plate; the 44px target is invisible padding around the word.
 *
 *   <TextButton onClick={skip}>Skip</TextButton>
 *
 * It has no silhouette of its own, so its focus ring is a rounded box around the target.
 */
import { type HTMLMotionProps, motion } from "motion/react";
import type { MouseEvent, ReactNode, Ref } from "react";
import s from "./text.module.css";
import { cx, type Haptic, type Sfx, usePress } from "./usePress";

export type TextButtonProps = Omit<
	HTMLMotionProps<"button">,
	"children" | "ref" | "onClick"
> & {
	children: ReactNode;
	ref?: Ref<HTMLButtonElement>;
	onClick?: ((e: MouseEvent<HTMLButtonElement>) => void) | undefined;
	haptic?: Haptic | undefined;
	sfx?: Sfx | undefined;
	pressed?: boolean | undefined;
	focused?: boolean | undefined;
};

export function TextButton({
	children,
	haptic,
	sfx,
	pressed,
	focused,
	disabled,
	onClick,
	className,
	type = "button",
	...rest
}: TextButtonProps) {
	const press = usePress({
		onClick,
		haptic,
		sfx,
		disabled,
		pressed,
		scale: 0.94,
	});
	return (
		<motion.button
			type={type}
			className={cx(s.btn, className)}
			data-focused={focused || undefined}
			disabled={disabled}
			{...press}
			{...rest}
		>
			{children}
		</motion.button>
	);
}
