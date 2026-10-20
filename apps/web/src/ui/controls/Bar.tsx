"use client";

/**
 * The wax family's subordinate bars, one body for two tones:
 *
 *   tone "secondary": dark umber wax, gilt seal glyph, gilt Grenze label (SecondaryButton)
 *   tone "danger":    dark iron, a broken red seal, red label (DangerButton)
 *
 * Same organic edge as the primary wax bar (the shared #ctl-edge displacement and the
 * uneven corner radii), but the seal sits inside the bar and is small: clearly second to
 * the red PrimaryButton. Layers, back to front: face < loading light < glyph < label; the
 * focus ring is drawn around the face by the shared ring filter.
 */
import { type HTMLMotionProps, type MotionStyle, motion } from "motion/react";
import type { MouseEvent, ReactNode, Ref } from "react";
import s from "./bar.module.css";
import { useControlDefs } from "./defs";
import { BrokenSeal, GiltSeal } from "./glyphs";
import r from "./ring.module.css";
import { cx, type Haptic, type Sfx, usePress } from "./usePress";

export type BarProps = Omit<
	HTMLMotionProps<"button">,
	"children" | "ref" | "onClick"
> & {
	children: ReactNode;
	ref?: Ref<HTMLButtonElement>;
	onClick?: ((e: MouseEvent<HTMLButtonElement>) => void) | undefined;
	/** "md" (48px, default): rows, sheets, cards. "lg" (56px): beside or under a primary. */
	size?: "lg" | "md" | undefined;
	/** Shrink to the label instead of filling the row. */
	inline?: boolean | undefined;
	/** Replace the seal glyph (keep it small and gilt); `null` for none. */
	icon?: ReactNode | null | undefined;
	/** Light spreads out of the glyph; `progress` 0..1, or an indeterminate pass. */
	loading?: boolean | undefined;
	progress?: number | undefined;
	haptic?: Haptic | undefined;
	sfx?: Sfx | undefined;
	/** Review sheet only: hold the pressed / focused look. */
	pressed?: boolean | undefined;
	focused?: boolean | undefined;
};

export function Bar({
	tone,
	children,
	size = "md",
	inline,
	icon,
	loading,
	progress,
	haptic,
	sfx,
	pressed,
	focused,
	disabled,
	onClick,
	className,
	style,
	type = "button",
	...rest
}: BarProps & { tone: "secondary" | "danger" }) {
	useControlDefs();
	const press = usePress({ onClick, haptic, sfx, disabled, pressed });
	const prog =
		progress === undefined ? undefined : Math.max(0, Math.min(1, progress));
	const glyph =
		icon === undefined ? (
			tone === "danger" ? (
				<BrokenSeal />
			) : (
				<GiltSeal />
			)
		) : (
			icon
		);
	return (
		<motion.button
			type={type}
			className={cx(r.host, s.btn, className)}
			data-tone={tone}
			data-size={size}
			data-inline={inline || undefined}
			data-glyph={glyph ? "" : undefined}
			data-busy={loading || undefined}
			data-indeterminate={(loading && prog === undefined) || undefined}
			data-focused={focused || undefined}
			aria-busy={loading || undefined}
			disabled={disabled}
			{...press}
			{...rest}
			style={
				{
					...(prog === undefined ? null : { "--p": prog }),
					...style,
				} as MotionStyle
			}
		>
			<span className={cx(r.shape, s.shape)} aria-hidden="true">
				<span className={s.face} />
				<span className={s.fill} />
			</span>
			{glyph ? (
				<span className={s.glyph} aria-hidden="true">
					{glyph}
				</span>
			) : null}
			<span className={s.label}>{children}</span>
		</motion.button>
	);
}
