/**
 * The sound engine: one Web Audio context, created on the first touch.
 *
 * API
 * ---
 *   arm()                      Install the first-gesture listener (idempotent). useSfx() calls it,
 *                              so a screen using the hook never has to.
 *   play(cue, opts?)           Play a cue from ./cues.ts. Returns a Voice ({ stop(fadeMs?) }) or null
 *                              when silent (muted, not yet touched, tab hidden, rate-limited).
 *     opts.volume      0..1, multiplies the cue's own volume.        default 1
 *     opts.rate        playback rate (pitch and speed). 2 = octave up. default 1
 *     opts.pitchJitter random +/- semitones; overrides the cue's own.  default cue.jitter
 *     opts.delay       ms before it sounds (sample-accurate).        default 0
 *     opts.maxLate     if the file is still loading, play it only if it lands within this many ms.
 *                      default 250
 *   series(cue, n, opts?)      n quick repeats, each a little higher: counters ("+5 Light").
 *     opts.every ms between hits (70), opts.rise rate added per hit (0.045), opts.volume.
 *   preload(cues)              Warm cues a screen is about to need (e.g. the verdict cues on the
 *                              Gathering). Safe before the first gesture: runs right after it.
 *   duck(seconds?, level?)     Lower the ambient bus for a moment. Cues marked `duck` do it.
 *   stopAll(fadeMs?)           Fade out every sfx voice.
 *   setSound / setAmbient / setHaptics / setVolume   Persisted toggles (see ./settings.ts).
 *
 * Rules it keeps
 *   - Nothing sounds, loads or allocates before the first pointerdown/keydown/touchend: no autoplay,
 *     and a muted player never downloads a byte of audio.
 *   - Short UI cues (cue.preload) are fetched right after that first gesture; the rest on first use
 *     or via preload().
 *   - Buses: sfx and ambient, each into a master gain (= volume, 0 when muted).
 *   - At most 12 voices; a 13th steals the oldest (15 ms fade, no click).
 *   - The context is suspended while the tab is hidden and while muted (no CPU spent on silence).
 *   - iOS: the audio session is set to "ambient" where supported, so the game mixes with the
 *     player's music and obeys the silent switch.
 *   - Every export is a no-op on the server and where Web Audio is missing.
 */
import { AMBIENT, audioUrl, CUE_NAMES, CUES, type Cue } from "./cues";
import {
	getSettings,
	type SoundSettings,
	setSettings,
	subscribeSettings,
} from "./settings";

export type PlayOptions = {
	volume?: number;
	rate?: number;
	pitchJitter?: number;
	delay?: number;
	maxLate?: number;
};

export type Voice = { stop(fadeMs?: number): void };

export type SeriesOptions = { every?: number; rise?: number; volume?: number };

const MAX_VOICES = 12;
const DUCK_LEVEL = 0.25;
const MAX_SERIES = 14;

type Live = {
	src: AudioBufferSourceNode;
	gain: GainNode;
	done: boolean;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let ambBus: GainNode | null = null;

let armed = false;
/** A real user gesture has happened (the context may be created/resumed). */
let gestured = false;
/** The context exists and has been kicked inside a gesture. */
let unlocked = false;

const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
const wanted = new Set<string>();
const lastStart = new Map<Cue, number>();
const voices: Live[] = [];

let ambient: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let ambientPending = false;
let duckEnd = 0;
let suspendTimer: ReturnType<typeof setTimeout> | null = null;

// ------------------------------------------------------------------ setup

function Ctor(): typeof AudioContext | undefined {
	if (typeof window === "undefined") return undefined;
	return (
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext
	);
}

/** True where Web Audio exists (false on the server). */
export function supported(): boolean {
	return Ctor() !== undefined;
}

/** Install the first-gesture listener. Idempotent; call from any client effect. */
export function arm(): void {
	if (armed || !supported()) return;
	armed = true;
	const opts = { capture: true, passive: true } as const;
	// Kept for the page's life (it is a cheap check): iOS can drop the context back to
	// "interrupted" after a call or Siri, and only a fresh gesture resumes it.
	// pointerdown is not user activation for touch in Chrome/WebKit; touchend and click are, so
	// the unlock below re-runs on those until the context is actually running.
	for (const t of ["pointerdown", "keydown", "touchend", "click"] as const)
		window.addEventListener(t, onGesture, opts);
	document.addEventListener("visibilitychange", onVisibility);
	subscribeSettings(applySettings);
}

function onGesture(): void {
	gestured = true;
	wake();
}

/** Create or resume the context, if sound is on. Must run inside a gesture the first time. */
function wake(): void {
	const s = getSettings();
	if (!s.sound || !gestured) return;
	if (typeof document !== "undefined" && document.hidden) return;
	if (!ctx && !create()) return;
	const c = ctx as AudioContext;
	if (suspendTimer) {
		clearTimeout(suspendTimer);
		suspendTimer = null;
	}
	const first = !unlocked;
	if (c.state !== "running") {
		void c.resume().catch(() => {});
		// iOS unlocks output only after a buffer is started inside the gesture.
		try {
			const b = c.createBuffer(1, 1, c.sampleRate);
			const src = c.createBufferSource();
			src.buffer = b;
			src.connect(c.destination);
			src.start(0);
		} catch {
			/* ignore */
		}
	}
	if (first) {
		unlocked = true;
		for (const name of CUE_NAMES)
			if (CUES[name].preload) wanted.add(CUES[name].file);
	}
	for (const file of wanted) void load(file);
	wanted.clear();
	syncAmbient(s);
}

function create(): boolean {
	const C = Ctor();
	if (!C) return false;
	try {
		const nav = navigator as Navigator & { audioSession?: { type: string } };
		if (nav.audioSession) nav.audioSession.type = "ambient";
	} catch {
		/* not settable here */
	}
	try {
		ctx = new C({ latencyHint: "interactive" });
	} catch {
		return false;
	}
	master = ctx.createGain();
	master.connect(ctx.destination);
	sfxBus = ctx.createGain();
	sfxBus.connect(master);
	ambBus = ctx.createGain();
	ambBus.gain.value = AMBIENT.volume;
	ambBus.connect(master);
	master.gain.value = getSettings().volume;
	return true;
}

function applySettings(): void {
	const s = getSettings();
	if (!ctx || !master) {
		// Turned on inside a click (a gesture): start now.
		if (s.sound) wake();
		return;
	}
	const t = ctx.currentTime;
	master.gain.cancelScheduledValues(t);
	master.gain.setTargetAtTime(s.sound ? s.volume : 0, t, 0.03);
	if (s.sound) {
		wake();
	} else {
		syncAmbient(s);
		stopAll(80);
		// Let the fade finish, then stop the clock.
		if (suspendTimer) clearTimeout(suspendTimer);
		suspendTimer = setTimeout(() => {
			suspendTimer = null;
			if (!getSettings().sound) void ctx?.suspend().catch(() => {});
		}, 300);
	}
}

function onVisibility(): void {
	if (!ctx) return;
	if (document.hidden) void ctx.suspend().catch(() => {});
	else if (getSettings().sound) void ctx.resume().catch(() => {});
}

// ------------------------------------------------------------------ loading

function decode(c: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
	// Old Safari only has the callback form; new browsers return a promise too.
	return new Promise((resolve, reject) => {
		const p = c.decodeAudioData(data, resolve, reject) as
			| Promise<AudioBuffer>
			| undefined;
		p?.then(resolve, reject);
	});
}

function load(file: string): Promise<AudioBuffer | null> {
	const hit = loading.get(file);
	if (hit) return hit;
	const c = ctx;
	if (!c) return Promise.resolve(null);
	const p = fetch(audioUrl(file))
		.then((r) => {
			if (!r.ok) throw new Error(String(r.status));
			return r.arrayBuffer();
		})
		.then((data) => decode(c, data))
		.then((b) => {
			buffers.set(file, b);
			return b;
		})
		.catch(() => {
			loading.delete(file); // let a later call retry
			return null;
		});
	loading.set(file, p);
	return p;
}

/** Warm cues ahead of need. Before the first gesture they are queued, not fetched. */
export function preload(cues: readonly Cue[]): void {
	if (!supported()) return;
	for (const c of cues) {
		const file = CUES[c].file;
		if (buffers.has(file) || loading.has(file)) continue;
		if (ctx && unlocked && getSettings().sound) void load(file);
		else wanted.add(file);
	}
}

// ------------------------------------------------------------------ playing

function canSound(): boolean {
	return (
		ctx !== null &&
		unlocked &&
		getSettings().sound &&
		!(typeof document !== "undefined" && document.hidden)
	);
}

function start(
	buf: AudioBuffer,
	cue: Cue,
	opts: PlayOptions,
	lateMs: number,
): Live | null {
	const c = ctx;
	if (!c || !sfxBus) return null;
	const def = CUES[cue];
	const semis = opts.pitchJitter ?? def.jitter;
	const j = semis ? (Math.random() * 2 - 1) * semis : 0;
	const rate = Math.max(0.25, (opts.rate ?? 1) * 2 ** (j / 12));

	if (voices.length >= MAX_VOICES) {
		const old = voices.shift();
		if (old) fadeStop(old, 15);
	}

	const src = c.createBufferSource();
	src.buffer = buf;
	src.playbackRate.value = rate;
	const gain = c.createGain();
	gain.gain.value = Math.max(0, def.volume * (opts.volume ?? 1));
	src.connect(gain);
	gain.connect(sfxBus);

	const live: Live = { src, gain, done: false };
	voices.push(live);
	src.onended = () => {
		live.done = true;
		const i = voices.indexOf(live);
		if (i >= 0) voices.splice(i, 1);
		gain.disconnect();
	};
	const delay = Math.max(0, (opts.delay ?? 0) - lateMs) / 1000;
	src.start(c.currentTime + delay);
	if (def.duck) duck(delay + buf.duration / rate + 0.2);
	return live;
}

function fadeStop(v: Live, ms: number): void {
	if (v.done || !ctx) return;
	const t = ctx.currentTime;
	try {
		v.gain.gain.cancelScheduledValues(t);
		v.gain.gain.setValueAtTime(v.gain.gain.value, t);
		v.gain.gain.linearRampToValueAtTime(0, t + ms / 1000);
		v.src.stop(t + ms / 1000 + 0.01);
	} catch {
		/* already stopped */
	}
}

function voiceOf(get: () => Live | null): Voice {
	return {
		stop(fadeMs = 60) {
			const v = get();
			if (v) fadeStop(v, fadeMs);
		},
	};
}

function playInner(
	cue: Cue,
	opts: PlayOptions,
	checkGap: boolean,
): Voice | null {
	if (!canSound()) return null;
	const def = CUES[cue];
	const now = performance.now();
	if (checkGap && def.gap) {
		const last = lastStart.get(cue);
		if (last !== undefined && now - last < def.gap) return null;
	}
	lastStart.set(cue, now);

	const buf = buffers.get(def.file);
	if (buf) {
		const v = start(buf, cue, opts, 0);
		return v ? voiceOf(() => v) : null;
	}
	// Still loading: play it when it lands, unless that is too late to feel tied to the tap.
	let live: Live | null = null;
	let cancelled = false;
	const maxLate = opts.maxLate ?? 250;
	void load(def.file).then((b) => {
		const late = performance.now() - now;
		if (!b || cancelled || late > maxLate || !canSound()) return;
		live = start(b, cue, opts, late);
	});
	return {
		stop(fadeMs = 60) {
			cancelled = true;
			if (live) fadeStop(live, fadeMs);
		},
	};
}

/** Play a cue. See the API notes at the top of this file. */
export function play(cue: Cue, opts: PlayOptions = {}): Voice | null {
	return playInner(cue, opts, true);
}

/** n quick repeats rising in pitch, for counters. Capped at 14 hits. */
export function series(cue: Cue, n: number, opts: SeriesOptions = {}): void {
	if (!canSound() || n <= 0) return;
	const every = opts.every ?? 70;
	const rise = opts.rise ?? 0.045;
	const count = Math.min(MAX_SERIES, Math.floor(n));
	for (let i = 0; i < count; i++)
		playInner(
			cue,
			{
				delay: i * every,
				rate: 1 + i * rise,
				pitchJitter: 0.15,
				volume: opts.volume ?? 1,
			},
			i === 0,
		);
}

/** Lower the ambient bus for `seconds`, then let it swell back. */
export function duck(seconds = 1.5, level = DUCK_LEVEL): void {
	if (!ctx || !ambBus || !ambient) return;
	const t = ctx.currentTime;
	duckEnd = Math.max(duckEnd, t + seconds);
	const p = ambBus.gain;
	p.cancelScheduledValues(t);
	p.setValueAtTime(p.value, t);
	p.setTargetAtTime(AMBIENT.volume * level, t, 0.06);
	p.setTargetAtTime(AMBIENT.volume, duckEnd, 0.5);
}

/** Fade out every sfx voice (the ambient bed is left alone). */
export function stopAll(fadeMs = 60): void {
	for (const v of voices.splice(0)) fadeStop(v, fadeMs);
}

// ------------------------------------------------------------------ ambient

function syncAmbient(s: SoundSettings): void {
	if (s.sound && s.ambient && ctx && unlocked) startAmbient();
	else stopAmbient();
}

function startAmbient(): void {
	if (ambient || ambientPending) return;
	ambientPending = true;
	void load(AMBIENT.file).then((b) => {
		ambientPending = false;
		const s = getSettings();
		const c = ctx;
		if (!b || !c || !ambBus || ambient || !(s.sound && s.ambient)) return;
		const src = c.createBufferSource();
		src.buffer = b;
		src.loop = true;
		// Skip the MP3 encoder padding at either end so the seam is clean.
		src.loopStart = Math.min(0.06, b.duration / 4);
		src.loopEnd = Math.max(src.loopStart + 0.1, b.duration - 0.06);
		const gain = c.createGain();
		gain.gain.setValueAtTime(0, c.currentTime);
		gain.gain.linearRampToValueAtTime(1, c.currentTime + 2.5);
		src.connect(gain);
		gain.connect(ambBus);
		src.start(c.currentTime, src.loopStart);
		ambient = { src, gain };
	});
}

function stopAmbient(): void {
	const a = ambient;
	if (!a || !ctx) return;
	ambient = null;
	const t = ctx.currentTime;
	a.gain.gain.cancelScheduledValues(t);
	a.gain.gain.setValueAtTime(a.gain.gain.value, t);
	a.gain.gain.linearRampToValueAtTime(0, t + 0.6);
	try {
		a.src.stop(t + 0.65);
	} catch {
		/* ignore */
	}
	a.src.onended = () => a.gain.disconnect();
}

// ------------------------------------------------------------------ toggles

export const setSound = (on: boolean) => setSettings({ sound: on });
export const setAmbient = (on: boolean) => setSettings({ ambient: on });
export const setHaptics = (on: boolean) => setSettings({ haptics: on });
export const setVolume = (v: number) =>
	setSettings({ volume: Math.min(1, Math.max(0, v)) });

/** For debugging and the preview harness. */
export function audioState(): {
	supported: boolean;
	unlocked: boolean;
	context: AudioContextState | "none";
	voices: number;
	loaded: number;
} {
	return {
		supported: supported(),
		unlocked,
		context: ctx?.state ?? "none",
		voices: voices.length,
		loaded: buffers.size,
	};
}
