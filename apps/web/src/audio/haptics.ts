/**
 * Vibration, where the platform has it (Android Chrome/Firefox). iOS Safari has no
 * navigator.vibrate, so every call is a silent no-op there, and on the server.
 *
 *   buzz(HAPTIC.devour);
 *   buzz(12);
 *
 * Respects the "Vibration" switch (settings.haptics) and waits for the first tap
 * (browsers refuse, and log, vibration before any user activation).
 */
import { getSettings } from "./settings";

/** Patterns in ms (on, off, on...). Short: a phone buzz is loud. */
export const HAPTIC = {
	tap: 8,
	tab: 6,
	error: [12, 40, 12],
	seal: 18,
	kindle: [10, 30, 14],
	devour: [30, 40, 60],
	collect: 14,
	reveal: 20,
	relic: [20, 50, 20, 50, 40],
	unlock: [16, 60, 24],
	promote: [24, 60, 24, 60, 50],
	win: [20, 50, 40],
	lose: 40,
} as const satisfies Record<string, number | readonly number[]>;

export function buzz(pattern: number | readonly number[] = 10): void {
	if (typeof navigator === "undefined") return;
	if (!getSettings().haptics) return;
	const nav = navigator as Navigator & {
		vibrate?: (p: number | number[]) => boolean;
		userActivation?: { hasBeenActive: boolean };
	};
	if (typeof nav.vibrate !== "function") return;
	if (nav.userActivation && !nav.userActivation.hasBeenActive) return;
	if (typeof document !== "undefined" && document.hidden) return;
	try {
		nav.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
	} catch {
		/* not allowed yet: ignore */
	}
}
