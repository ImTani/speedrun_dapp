/**
 * Coach signals: a screen says "the player just did X" (picked a mask, set a Sigil, typed a
 * name) and any coach mark waiting on X advances. Taps on the target advance a coach on their
 * own; signals cover actions that are not taps (swipes, drags, typing).
 */

const EVENT = "apostasy:coach";

/** Tell any coach mark waiting on `id` that the player performed it. */
export function coachAct(id: string) {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: id }));
}

/** Listen for coach signals. Returns the unsubscribe. */
export function onCoachAct(cb: (id: string) => void): () => void {
	const h = (e: Event) => cb((e as CustomEvent<string>).detail);
	window.addEventListener(EVENT, h);
	return () => window.removeEventListener(EVENT, h);
}

/** The CSS selector for a coach target: a data-coach id, or a selector passed as-is. */
export function coachSelector(target: string): string {
	return /^[[.#]/.test(target) || target.includes(",")
		? target
		: `[data-coach="${target}"]`;
}
