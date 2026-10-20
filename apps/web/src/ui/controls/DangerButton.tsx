"use client";

import { Bar, type BarProps } from "./Bar";

/**
 * A destructive confirm: the broken seal. Dark iron bar, a cracked red seal, a red label.
 * Pair it with a TextButton (or SecondaryButton) that backs out; never the only way on.
 *
 *   <DangerButton onClick={erase}>Delete my account</DangerButton>
 */
export function DangerButton(props: BarProps) {
	return <Bar tone="danger" {...props} />;
}
