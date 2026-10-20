"use client";

/**
 * React side of the sound engine.
 *
 *   const sfx = useSfx(["devour", "kindle", "win", "lose"]); // optional: warm these
 *   <button onClick={() => { sfx.play("tap"); ... }}>
 *   sfx.series("light", gained);           // "+5 Light", one ding per point, rising
 *   sfx.buzz(HAPTIC.devour);               // Android vibration, respects the switch
 *
 *   const [settings, set] = useSoundSettings();
 *   set({ ambient: true });
 *
 * The returned object is stable (safe in effect deps). Every call is a no-op on the
 * server, before the first tap, and while muted.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Cue } from "./cues";
import { arm, duck, play, preload, series, stopAll } from "./engine";
import { buzz } from "./haptics";
import {
	getServerSettings,
	getSettings,
	type SoundSettings,
	setSettings,
	subscribeSettings,
} from "./settings";

export type Sfx = {
	play: typeof play;
	series: typeof series;
	duck: typeof duck;
	stopAll: typeof stopAll;
	buzz: typeof buzz;
};

const SFX: Sfx = { play, series, duck, stopAll, buzz };

/** Arms the engine (first-gesture unlock) and optionally warms `warm` cues. */
export function useSfx(warm?: readonly Cue[]): Sfx {
	// Joined so an inline array literal doesn't re-run the effect every render.
	const key = warm?.join(",") ?? "";
	useEffect(() => {
		arm();
		if (key) preload(key.split(",") as Cue[]);
	}, [key]);
	return SFX;
}

/** Live sound settings plus a setter that persists. */
export function useSoundSettings(): [
	SoundSettings,
	(patch: Partial<SoundSettings>) => void,
] {
	const s = useSyncExternalStore(
		subscribeSettings,
		getSettings,
		getServerSettings,
	);
	useEffect(() => {
		arm();
	}, []);
	return useMemo(() => [s, setSettings], [s]);
}
