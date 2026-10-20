/**
 * The cue sheet: every sound in the cathedral, its file and how loud it sits.
 *
 * Files are built by src/audio/tools/build-audio.mjs from human-recorded CC0
 * sources (Kenney packs and Freesound), mono 44.1 kHz MP3, peak-normalised to
 * -1 dBFS. Loudness between cues is set HERE (`volume`), not in the files.
 * Provenance per cue: public/ATTRIBUTION.md, section "Sound".
 */

export type Cue =
	// touch
	| "tap"
	| "tab"
	| "error"
	// counters
	| "light"
	| "ash"
	// rites
	| "toll"
	| "seal"
	| "unveil"
	| "kindle"
	| "devour"
	| "collect"
	| "scryBuild"
	// reveals, escalating
	| "rarityCommon"
	| "rarityRare"
	| "rarityRelic"
	// progress
	| "unlock"
	| "levelUp"
	| "promote"
	| "win"
	| "lose";

export type CueDef = {
	/** File in /public/audio. */
	file: string;
	/** 0..1, before the master volume. */
	volume: number;
	/** Random pitch spread in semitones (+/-), so repeats don't sound stamped. */
	jitter: number;
	/** Fetched right after the first tap (small, needed at once). */
	preload?: boolean;
	/** Minimum ms between two starts of this cue; extra calls are dropped. */
	gap?: number;
	/** Duck the ambient bus while this plays (big moments). */
	duck?: boolean;
};

/** Bump when the files change, so browsers fetch the new ones. */
export const AUDIO_VERSION = 1;

export const CUES: Record<Cue, CueDef> = {
	tap: { file: "tap.mp3", volume: 0.35, jitter: 1.2, preload: true, gap: 30 },
	tab: { file: "tab.mp3", volume: 0.4, jitter: 0.8, preload: true, gap: 60 },
	error: {
		file: "error.mp3",
		volume: 0.45,
		jitter: 0.4,
		preload: true,
		gap: 120,
	},

	light: {
		file: "light.mp3",
		volume: 0.32,
		jitter: 0.3,
		preload: true,
		gap: 28,
	},
	ash: { file: "ash.mp3", volume: 0.3, jitter: 1.5, preload: true, gap: 28 },

	toll: { file: "toll.mp3", volume: 0.7, jitter: 0.2, duck: true, gap: 400 },
	seal: { file: "seal.mp3", volume: 0.6, jitter: 0.6, preload: true },
	unveil: { file: "unveil.mp3", volume: 0.5, jitter: 0.8, preload: true },
	kindle: { file: "kindle.mp3", volume: 0.7, jitter: 0.3, duck: true },
	devour: { file: "devour.mp3", volume: 0.9, jitter: 0.4, duck: true },
	collect: { file: "collect.mp3", volume: 0.55, jitter: 0.5, gap: 150 },
	scryBuild: { file: "scryBuild.mp3", volume: 0.6, jitter: 0 },

	rarityCommon: { file: "rarityCommon.mp3", volume: 0.55, jitter: 0.3 },
	rarityRare: { file: "rarityRare.mp3", volume: 0.7, jitter: 0.2, duck: true },
	rarityRelic: {
		file: "rarityRelic.mp3",
		volume: 0.85,
		jitter: 0,
		duck: true,
	},

	unlock: { file: "unlock.mp3", volume: 0.65, jitter: 0, duck: true },
	levelUp: { file: "levelUp.mp3", volume: 0.65, jitter: 0, duck: true },
	promote: { file: "promote.mp3", volume: 0.9, jitter: 0, duck: true },
	win: { file: "win.mp3", volume: 0.8, jitter: 0, duck: true },
	lose: { file: "lose.mp3", volume: 0.7, jitter: 0, duck: true },
};

/** The cathedral room tone: a 20 s seamless loop on its own bus. Off by default. */
export const AMBIENT = { file: "ambient.mp3", volume: 0.35 } as const;

export const CUE_NAMES = Object.keys(CUES) as Cue[];

export const audioUrl = (file: string) => `/audio/${file}?v=${AUDIO_VERSION}`;
