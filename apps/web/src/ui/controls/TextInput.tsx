"use client";

/**
 * A text field in the frame language: a sunk chamfered well, Grenze roman (never
 * blackletter), a gilt caret; focus draws the shared ring around the well's real corners.
 *
 *   <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={18}
 *     aria-label={T.nameLabel} placeholder={T.namePlaceholder} />
 *
 * `size` "lg" (56px, centred h3: the Fragment's name) or "md" (48px, body, left aligned).
 * Every other prop goes to the <input>; `className` lays out the wrapper.
 */
import type { InputHTMLAttributes, Ref } from "react";
import { useControlDefs } from "./defs";
import f from "./frame.module.css";
import s from "./input.module.css";
import { cx } from "./usePress";

export type TextInputProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"size"
> & {
	ref?: Ref<HTMLInputElement>;
	size?: "lg" | "md" | undefined;
	/** Review sheet only: hold the focused look. */
	focused?: boolean | undefined;
};

export function TextInput({
	className,
	size = "lg",
	focused,
	disabled,
	ref,
	type = "text",
	...rest
}: TextInputProps) {
	useControlDefs();
	return (
		<span
			className={cx(f.host, s.field, className)}
			data-shape="cut"
			data-well=""
			data-size={size}
			data-focused={focused || undefined}
			data-disabled={disabled || undefined}
		>
			<span className={cx(f.frame, s.well)} aria-hidden="true">
				<span className={f.rim} />
				<span className={f.face} />
			</span>
			<input
				ref={ref}
				type={type}
				className={s.input}
				disabled={disabled}
				{...rest}
			/>
		</span>
	);
}
