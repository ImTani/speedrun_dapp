/**
 * The one sheet grip: a short rounded bone bar centred at the top of a bottom sheet.
 * Decorative (aria-hidden); when the sheet drags, put the drag handler on the sheet's
 * head (or pass it here: the grip then gets a 44px tall target and a grab cursor).
 *
 *   <Grip />
 *   <Grip onPointerDown={(e) => drag.start(e)} />
 */
import type { HTMLAttributes } from "react";
import s from "./grip.module.css";
import { cx } from "./usePress";

export function Grip({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
	const drags = typeof rest.onPointerDown === "function";
	return (
		<span
			className={cx(s.grip, className)}
			data-drag={drags || undefined}
			aria-hidden="true"
			{...rest}
		/>
	);
}
