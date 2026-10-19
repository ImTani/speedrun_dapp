/**
 * Rubric: a small engraved-capitals label (section heads, stat names, tags).
 * Named for the red/gilt headings scribes ruled into manuscripts.
 *
 *   <Rubric rule="both">{L.gathering.tollsHead}</Rubric>
 */
import type { ReactNode } from "react";
import s from "./type.module.css";

export type RubricProps = {
	children: ReactNode;
	as?: "span" | "p" | "div" | "h2" | "h3" | "h4" | "dt";
	tone?: "gilt" | "bone" | "dim" | "blood";
	size?: "xs" | "sm";
	/** Hairline rules beside the label. */
	rule?: "none" | "both" | "before" | "after";
	id?: string;
	className?: string;
};

export function Rubric({
	children,
	as: Tag = "span",
	tone = "gilt",
	size = "sm",
	rule = "none",
	id,
	className,
}: RubricProps) {
	return (
		<Tag
			id={id}
			className={className ? `${s.rubric} ${className}` : s.rubric}
			data-tone={tone}
			data-size={size}
			data-rule={rule}
		>
			{children}
		</Tag>
	);
}
