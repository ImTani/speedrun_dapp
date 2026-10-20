/**
 * Sound settings, persisted in localStorage and readable from React with
 * useSyncExternalStore. Defaults: sound ON, ambient OFF, vibration ON.
 * Safe on the server (returns the defaults, never touches storage).
 */

export type SoundSettings = {
	/** Master switch for every sound (sfx and ambient). */
	sound: boolean;
	/** The cathedral room tone. */
	ambient: boolean;
	/** navigator.vibrate on Android. */
	haptics: boolean;
	/** Master volume, 0..1. */
	volume: number;
};

export const DEFAULT_SETTINGS: SoundSettings = Object.freeze({
	sound: true,
	ambient: false,
	haptics: true,
	volume: 0.8,
});

const KEY = "apostasy.sound.v1";

let current: SoundSettings | null = null;
const listeners = new Set<() => void>();

function read(): SoundSettings {
	if (typeof window === "undefined") return DEFAULT_SETTINGS;
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) return DEFAULT_SETTINGS;
		const v = JSON.parse(raw) as Partial<SoundSettings>;
		return {
			sound: typeof v.sound === "boolean" ? v.sound : DEFAULT_SETTINGS.sound,
			ambient:
				typeof v.ambient === "boolean" ? v.ambient : DEFAULT_SETTINGS.ambient,
			haptics:
				typeof v.haptics === "boolean" ? v.haptics : DEFAULT_SETTINGS.haptics,
			volume:
				typeof v.volume === "number" && v.volume >= 0 && v.volume <= 1
					? v.volume
					: DEFAULT_SETTINGS.volume,
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}

/** Current settings (stable object until something changes). */
export function getSettings(): SoundSettings {
	if (typeof window === "undefined") return DEFAULT_SETTINGS;
	if (!current) current = read();
	return current;
}

/** Merge and persist. Listeners (React, the engine) are told synchronously. */
export function setSettings(patch: Partial<SoundSettings>): void {
	if (typeof window === "undefined") return;
	const next = { ...getSettings(), ...patch };
	current = next;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		/* private mode / full storage: keep it in memory */
	}
	for (const l of listeners) l();
}

export function subscribeSettings(fn: () => void): () => void {
	listeners.add(fn);
	return () => {
		listeners.delete(fn);
	};
}

/** Server snapshot for useSyncExternalStore. */
export const getServerSettings = () => DEFAULT_SETTINGS;

// Another tab changed the settings: follow it.
if (typeof window !== "undefined") {
	window.addEventListener("storage", (e) => {
		if (e.key !== KEY) return;
		current = read();
		for (const l of listeners) l();
	});
}
