"use client";

/**
 * A selectable token: a mask in the carousel strip, a First Gesture, a wardrobe swatch.
 * Rest: umber rim. Selected: the gilt rim and glow. Disabled: desaturated.
 *
 *   <Chip selected={i === aspect} onClick={() => choose(i)} aria-label={name}>
 *     <Mask aspect={i} size={36} />
 *   </Chip>
 *   <Chip kind="radio" selected={g === gesture} onClick={...}>Mercy</Chip>
 *
 * `kind="toggle"` (default) reports `aria-pressed`; `kind="radio"` is one of a set
 * (wrap the set in role="radiogroup"). Chamfered by default; `shape="round"` for coins.
 */
import { type HTMLMotionProps, motion } from "motion/react";
import type { MouseEvent, ReactNode, Ref } from "react";
import s from "./chip.module.css";
import { useControlDefs } from "./defs";
import f from "./frame.module.css";
import r from "./ring.module.css";
import { cx, type Haptic, type Sfx, usePress } from "./usePress";

export type ChipProps = Omit<
	HTMLMotionProps<"button">,
	"children" | "ref" | "onClick"
> & {
	children: ReactNode;
	selected?: boolean | undefined;
	kind?: "toggle" | "radio" | undefined;
	shape?: "cut" | "round" | undefined;
	/** "md" 44px (default); "lg" 56px square-ish tiles. */
	size?: "md" | "lg" | undefined;
	ref?: Ref<HTMLButtonElement>;
	onClick?: ((e: MouseEvent<HTMLButtonElement>) => void) | undefined;
	haptic?: Haptic | undefined;
	sfx?: Sfx | undefined;
	pressed?: boolean | undefined;
	focused?: boolean | undefined;
};

export function Chip({
	children,
	selected = false,
	kind = "toggle",
	shape = "cut",
	size = "md",
	haptic,
	sfx,
	pressed,
	focused,
	disabled,
	onClick,
	className,
	type = "button",
	...rest
}: ChipProps) {
	useControlDefs();
	const press = usePress({
		onClick,
		haptic,
		sfx,
		disabled,
		pressed,
		scale: 0.92,
	});
	const a11y =
		kind === "radio"
			? { role: "radio", "aria-checked": selected }
			: { "aria-pressed": selected };
	return (
		<motion.button
			type={type}
			className={cx(r.host, f.host, s.chip, className)}
			data-shape={shape}
			data-size={size}
			data-selected={selected || undefined}
			data-focused={focused || undefined}
			disabled={disabled}
			{...a11y}
			{...press}
			{...rest}
		>
			<span className={cx(r.shape, f.frame)} aria-hidden="true">
				<span className={f.rim} />
				<span className={f.face} />
			</span>
			{children}
		</motion.button>
	);
}
