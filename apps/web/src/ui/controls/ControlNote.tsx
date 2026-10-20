/**
 * The small line under a button: why it is disabled, or what pressing it costs or waits
 * on. The button label stays the action plus at most one number; everything else goes
 * here.
 *
 *   const note = useId();
 *   <PrimaryButton size="md" disabled aria-describedby={note}>Buy · 5 USDC</PrimaryButton>
 *   <ControlNote id={note}>You have 4.00 USDC</ControlNote>
 *
 * tone "muted" (default, bone-d), "warn" (ember: a problem the player can fix), "gilt"
 * (good news: "Ready", "Free today"). `align` follows the button (centre by default).
 */
import type { ReactNode } from "react";
import s from "./note.module.css";
import { cx } from "./usePress";

export function ControlNote({
	children,
	id,
	tone = "muted",
	align = "center",
	className,
}: {
	children: ReactNode;
	id?: string | undefined;
	tone?: "muted" | "warn" | "gilt" | undefined;
	align?: "center" | "start" | undefined;
	className?: string | undefined;
}) {
	return (
		<p
			id={id}
			className={cx(s.note, className)}
			data-tone={tone}
			data-align={align}
		>
			{children}
		</p>
	);
}
