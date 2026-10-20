"use client";

/**
 * A round stone token with a gilt glyph: gear, speaker, back, close, the carousel arrows,
 * the hourglass skip. `label` is required (it is the accessible name; there is no text).
 *
 *   <IconButton icon="close" label={T.close} onClick={onClose} />
 *   <IconButton icon="speakerOff" label={T.unmute} aria-pressed={false} size="sm" />
 *   <IconButton icon={<MyGlyph />} label="..." />
 *
 * sm: a 36px token inside a 44px target (header chrome). md: a 46px token (default).
 */
import { type HTMLMotionProps, motion } from "motion/react";
import type { MouseEvent, ReactNode, Ref } from "react";
import { useControlDefs } from "./defs";
import { GLYPHS, type GlyphName } from "./glyphs";
import s from "./icon.module.css";
import r from "./ring.module.css";
import { cx, type Haptic, type Sfx, usePress } from "./usePress";

export type IconButtonProps = Omit<
	HTMLMotionProps<"button">,
	"children" | "ref" | "onClick" | "aria-label"
> & {
	icon: GlyphName | ReactNode;
	label: string;
	size?: "sm" | "md" | undefined;
	ref?: Ref<HTMLButtonElement>;
	onClick?: ((e: MouseEvent<HTMLButtonElement>) => void) | undefined;
	haptic?: Haptic | undefined;
	sfx?: Sfx | undefined;
	pressed?: boolean | undefined;
	focused?: boolean | undefined;
};

const isGlyph = (v: unknown): v is GlyphName =>
	typeof v === "string" && v in GLYPHS;

export function IconButton({
	icon,
	label,
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
}: IconButtonProps) {
	useControlDefs();
	const press = usePress({
		onClick,
		haptic,
		sfx,
		disabled,
		pressed,
		scale: 0.9,
	});
	return (
		<motion.button
			type={type}
			className={cx(r.host, s.btn, className)}
			data-size={size}
			data-focused={focused || undefined}
			aria-label={label}
			disabled={disabled}
			{...press}
			{...rest}
		>
			<span className={cx(r.shape, s.shape)} aria-hidden="true">
				<span className={s.face} />
			</span>
			<span className={s.glyph} aria-hidden="true">
				{isGlyph(icon) ? GLYPHS[icon] : icon}
			</span>
		</motion.button>
	);
}
