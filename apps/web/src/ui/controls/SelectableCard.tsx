"use client";

/**
 * A card you tap: a Spire floor, the Ledger of Light plaque, a Vestry or Reliquary card
 * that is itself the action, a Mark. The frame (rim + face) is drawn behind the caller's
 * own content, cut to one silhouette, so the selected rim and the focus ring follow the
 * chamfered corners.
 *
 *   <SelectableCard className={s.floor} selected={sel === n} tone={boss ? "blood" : undefined}
 *     disabled={locked} onClick={() => pick(n)} aria-label={...}>
 *     ...the floor's own grid of number, mask, name...
 *   </SelectableCard>
 *
 * `selected` undefined: a plain tappable card (the Ledger plaque), no aria-pressed.
 * `selected` boolean: a toggle (aria-pressed), or one of a set with `kind="radio"`.
 * The card lays out its children itself: pass the grid/flex in `className`.
 */
import { type HTMLMotionProps, motion } from "motion/react";
import type { MouseEvent, ReactNode, Ref } from "react";
import s from "./card.module.css";
import { useControlDefs } from "./defs";
import f from "./frame.module.css";
import r from "./ring.module.css";
import { cx, type Haptic, type Sfx, usePress } from "./usePress";

export type SelectableCardProps = Omit<
	HTMLMotionProps<"button">,
	"children" | "ref" | "onClick"
> & {
	children: ReactNode;
	selected?: boolean | undefined;
	kind?: "toggle" | "radio" | undefined;
	shape?: "cut" | "round" | "arch" | undefined;
	/** "blood": the boss floor's red rim. */
	tone?: "blood" | undefined;
	ref?: Ref<HTMLButtonElement>;
	onClick?: ((e: MouseEvent<HTMLButtonElement>) => void) | undefined;
	haptic?: Haptic | undefined;
	sfx?: Sfx | undefined;
	pressed?: boolean | undefined;
	focused?: boolean | undefined;
};

export function SelectableCard({
	children,
	selected,
	kind = "toggle",
	shape = "cut",
	tone,
	haptic,
	sfx,
	pressed,
	focused,
	disabled,
	onClick,
	className,
	type = "button",
	...rest
}: SelectableCardProps) {
	useControlDefs();
	const press = usePress({
		onClick,
		haptic,
		sfx,
		disabled,
		pressed,
		scale: 0.985,
	});
	const a11y =
		selected === undefined
			? null
			: kind === "radio"
				? { role: "radio", "aria-checked": selected }
				: disabled
					? null
					: { "aria-pressed": selected };
	return (
		<motion.button
			type={type}
			className={cx(r.host, f.host, s.card, className)}
			data-shape={shape}
			data-tone={tone}
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
