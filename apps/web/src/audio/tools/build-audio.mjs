// Builds public/audio/*.mp3 from human-recorded CC0 sources (provenance: public/ATTRIBUTION.md).
//
//   node src/audio/tools/build-audio.mjs fetch <cacheDir>   # download Kenney packs + Freesound previews
//   node src/audio/tools/build-audio.mjs build <cacheDir>   # trim, layer, normalise, encode
//
// Needs ffmpeg (with libmp3lame) on PATH, and `unzip` (or Windows 10+'s System32 tar.exe).
// Run from apps/web. The cache dir lives outside the repo; nothing in it is committed.
// Output: mono, 44.1 kHz MP3 (MP3 decodes in every browser's decodeAudioData, including old iOS).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 44100;
const OUT = "public/audio";

/** Kenney packs, all CC0 (kenney.nl/assets/<slug>). */
const KENNEY = {
	"interface-sounds":
		"https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip",
	"impact-sounds":
		"https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip",
	"rpg-audio":
		"https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip",
};

/** Freesound items, each verified CC0 on its own page. HQ previews (no login needed). */
const FREESOUND = {
	62964: "https://cdn.freesound.org/previews/62/62964_603783-hq.mp3", // Deep Bell, LadyCailin
	219047: "https://cdn.freesound.org/previews/219/219047_4056007-hq.mp3", // Church Clock Strikes 1, JarredGibb
	554655: "https://cdn.freesound.org/previews/554/554655_7990256-hq.mp3", // bec low bell solo, HMTSCCSound
	202003: "https://cdn.freesound.org/previews/202/202003_1992412-hq.mp3", // singing bowl hit 3, ryancacophony
	271370: "https://cdn.freesound.org/previews/271/271370_5159066-hq.mp3", // singing bowl strike, inoshirodesign
	527206: "https://cdn.freesound.org/previews/527/527206_10334845-hq.mp3", // Cathedral Organ, Beetlemuse
	444491: "https://cdn.freesound.org/previews/444/444491_9159316-hq.mp3", // Short Choir, Breviceps
	274121: "https://cdn.freesound.org/previews/274/274121_285997-hq.mp3", // Choir of Voices - Single Chord, bone666138
	398448: "https://cdn.freesound.org/previews/398/398448_3438463-hq.mp3", // Match Ignite (No Strike), brachern
	211624: "https://cdn.freesound.org/previews/211/211624_71257-hq.mp3", // Magic Wand Glitter, qubodup
	351408: "https://cdn.freesound.org/previews/351/351408_4067257-hq.mp3", // GLEAM-GLOW-SFX-CHIME, newagesoup
	174279: "https://cdn.freesound.org/previews/174/174279_2378802-hq.mp3", // Cathedral Ambience 1, Quistard
};

const [mode, cache] = process.argv.slice(2);
if (!mode || !cache) {
	console.error("usage: build-audio.mjs fetch|build <cacheDir>");
	process.exit(1);
}

// ------------------------------------------------------------------ fetch
async function fetchAll() {
	mkdirSync(join(cache, "fs"), { recursive: true });
	for (const [slug, url] of Object.entries(KENNEY)) {
		const zip = join(cache, `${slug}.zip`);
		const dir = join(cache, slug);
		if (!existsSync(zip)) await download(url, zip);
		mkdirSync(dir, { recursive: true });
		// unzip if present (Git Bash, macOS, Linux), else Windows' own bsdtar (reads zip).
		let r = spawnSync("unzip", ["-qo", zip, "-d", dir]);
		if (r.status !== 0) {
			const bsdtar = process.env.SystemRoot
				? join(process.env.SystemRoot, "System32", "tar.exe")
				: "tar";
			r = spawnSync(bsdtar, ["-xf", zip, "-C", dir], { stdio: "inherit" });
		}
		if (r.status !== 0) throw new Error(`could not extract ${zip}`);
	}
	for (const [id, url] of Object.entries(FREESOUND)) {
		const f = join(cache, "fs", `${id}.mp3`);
		if (!existsSync(f)) await download(url, f);
	}
}

async function download(url, to) {
	const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	writeFileSync(to, Buffer.from(await res.arrayBuffer()));
	console.log("got", to);
}

// ------------------------------------------------------------------ build helpers
const K = (pack, file) => join(cache, pack, "Audio", file);
const F = (id) => join(cache, "fs", `${id}.mp3`);

/**
 * Decode a slice of a file to mono Float32 at 44.1 kHz.
 * rate < 1 lowers pitch (and slows); rate > 1 raises it. `af` is extra ffmpeg filters.
 */
function load(file, { ss = 0, t, rate = 1, af } = {}) {
	const filters = [];
	if (rate !== 1)
		filters.push(`asetrate=${Math.round(SR * rate)}`, `aresample=${SR}`);
	if (af) filters.push(af);
	const args = ["-v", "error", "-ss", String(ss)];
	if (t) args.push("-t", String(t * Math.max(1, rate)));
	args.push("-i", file, "-ac", "1", "-ar", String(SR));
	if (filters.length) args.push("-af", filters.join(","));
	args.push("-f", "f32le", "-");
	const r = spawnSync("ffmpeg", args, { maxBuffer: 1 << 28 });
	if (r.status !== 0) throw new Error(`ffmpeg failed on ${file}: ${r.stderr}`);
	const b = r.stdout;
	let x = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4).slice();
	if (t) x = x.slice(0, Math.round(t * SR));
	return x;
}

/** Linear fades, in seconds. */
function fade(x, inS = 0.004, outS = 0.02) {
	const a = Math.min(x.length, Math.round(inS * SR));
	const b = Math.min(x.length, Math.round(outS * SR));
	for (let i = 0; i < a; i++) x[i] *= i / a;
	for (let i = 0; i < b; i++) x[x.length - 1 - i] *= i / b;
	return x;
}

/** Layer clips: [samples, delaySeconds, gain]. */
function mix(...layers) {
	const len = Math.max(
		...layers.map(([x, d]) => x.length + Math.round(d * SR)),
	);
	const y = new Float32Array(len);
	for (const [x, d, g = 1] of layers) {
		const o = Math.round(d * SR);
		for (let i = 0; i < x.length; i++) y[o + i] += x[i] * g;
	}
	return y;
}

const reverse = (x) => x.slice().reverse();

/** Drop leading/trailing samples quieter than -60 dBFS (keeps a 5 ms lead). */
function trim(x, db = -60) {
	const th = 10 ** (db / 20);
	let s = 0;
	let e = x.length - 1;
	while (s < e && Math.abs(x[s]) < th) s++;
	while (e > s && Math.abs(x[e]) < th) e--;
	return x.slice(Math.max(0, s - Math.round(0.005 * SR)), e + 1);
}

/** Peak-normalise to `db` dBFS. Per-cue loudness is set in src/audio/cues.ts. */
function norm(x, db = -1) {
	let p = 0;
	for (const v of x) p = Math.max(p, Math.abs(v));
	if (p === 0) return x;
	const g = 10 ** (db / 20) / p;
	return x.map((v) => v * g);
}

/** Make a seamless loop: the tail `xf` seconds is crossfaded into the head. */
function loopify(x, xf) {
	const n = Math.round(xf * SR);
	const body = x.slice(0, x.length - n);
	const tail = x.slice(x.length - n);
	for (let i = 0; i < n; i++) {
		const k = i / n;
		body[i] =
			body[i] * Math.sin((k * Math.PI) / 2) +
			tail[i] * Math.cos((k * Math.PI) / 2);
	}
	return body;
}

function write(name, x, kbps = 64) {
	const pcm = Buffer.from(norm(trim(x)).buffer);
	const out = join(OUT, `${name}.mp3`);
	const r = spawnSync(
		"ffmpeg",
		[
			"-v",
			"error",
			"-y",
			"-f",
			"f32le",
			"-ar",
			String(SR),
			"-ac",
			"1",
			"-i",
			"-",
			"-c:a",
			"libmp3lame",
			"-b:a",
			`${kbps}k`,
			out,
		],
		{ input: pcm },
	);
	if (r.status !== 0) throw new Error(`encode ${name}: ${r.stderr}`);
	console.log(
		`${name.padEnd(14)} ${(x.length / SR).toFixed(2)}s ${(statSync(out).size / 1024).toFixed(1)} KB`,
	);
}

// ------------------------------------------------------------------ the cues
function build() {
	mkdirSync(OUT, { recursive: true });
	const I = (f) => K("interface-sounds", f);
	const M = (f) => K("impact-sounds", f);
	const R = (f) => K("rpg-audio", f);

	// UI
	write(
		"tap",
		fade(
			load(M("impactWood_light_000.ogg"), { t: 0.2, af: "highpass=f=120" }),
			0.002,
			0.08,
		),
	);
	write(
		"tab",
		fade(load(R("bookFlip3.ogg"), { af: "highpass=f=200" }), 0.003, 0.06),
	);
	write(
		"error",
		fade(
			load(M("impactWood_medium_000.ogg"), {
				t: 0.26,
				rate: 0.85,
				af: "lowpass=f=900",
			}),
			0.002,
			0.1,
		),
	);
	write("light", fade(load(I("glass_001.ogg")), 0.001, 0.08));
	write(
		"ash",
		fade(
			load(M("footstep_snow_000.ogg"), { t: 0.16, af: "highpass=f=400" }),
			0.002,
			0.06,
		),
	);

	// Bells and rites
	write("toll", fade(load(F(62964), { t: 3.2 }), 0.003, 1.4), 80);
	write(
		"seal",
		fade(
			load(M("impactSoft_heavy_000.ogg"), { af: "lowpass=f=3000" }),
			0.002,
			0.15,
		),
	);
	write("unveil", fade(load(R("cloth1.ogg")), 0.01, 0.15));
	write(
		"kindle",
		fade(
			mix([load(F(398448)), 0, 0.85], [load(F(271370), { t: 1.2 }), 0.06, 1.6]),
			0.003,
			0.45,
		),
		80,
	);
	write(
		"devour",
		fade(
			mix(
				[load(M("impactPunch_heavy_000.ogg"), { rate: 0.85 }), 0, 0.9],
				[
					load(M("impactGlass_heavy_001.ogg"), { af: "highpass=f=500" }),
					0.015,
					1.1,
				],
			),
			0.001,
			0.2,
		),
	);
	write("collect", fade(load(F(211624), { t: 0.9 }), 0.03, 0.45), 80);
	write(
		"scryBuild",
		fade(reverse(load(F(202003), { t: 1.0 })), 0.5, 0.004),
		80,
	);

	// Reveals, escalating
	write("rarityCommon", fade(load(M("impactBell_heavy_003.ogg")), 0.002, 0.25));
	write("rarityRare", fade(load(F(219047), { t: 1.6 }), 0.002, 0.8), 80);
	write(
		"rarityRelic",
		fade(
			mix(
				[load(F(444491), { t: 2.3 }), 0, 1],
				[load(F(62964), { t: 2.3 }), 0, 0.55],
			),
			0.01,
			0.9,
		),
		96,
	);

	// Progress
	write(
		"unlock",
		fade(
			load(F(351408), { ss: 1.45, t: 2.0, af: "highpass=f=300" }),
			0.01,
			0.8,
		),
		80,
	);
	const strike = (rate) => fade(load(F(219047), { t: 0.9, rate }), 0.002, 0.3);
	write(
		"levelUp",
		fade(
			mix(
				[strike(0.67), 0, 1],
				[strike(0.67 * 1.26), 0.11, 0.9],
				[strike(0.67 * 1.5), 0.22, 0.85],
			),
			0.002,
			0.3,
		),
		80,
	);
	write(
		"promote",
		fade(
			mix(
				[fade(load(F(527206), { ss: 5.25, t: 1.8 }), 0.04, 0.6), 0, 0.9],
				[load(F(62964), { t: 1.8 }), 0, 0.8],
			),
			0.003,
			0.6,
		),
		96,
	);
	write(
		"win",
		fade(
			mix(
				[load(F(274121), { ss: 0.22, t: 1.9 }), 0, 1],
				[load(F(219047), { t: 1.6 }), 0.03, 0.35],
			),
			0.02,
			0.7,
		),
		96,
	);
	write(
		"lose",
		fade(
			load(F(554655), { ss: 0.35, t: 1.7, rate: 0.85, af: "lowpass=f=900" }),
			0.01,
			0.8,
		),
		80,
	);

	// Ambient: the quietest stretch of a cathedral interior, looped. Off by default.
	write(
		"ambient",
		loopify(
			norm(
				load(F(174279), { ss: 268, t: 22, af: "highpass=f=60,lowpass=f=6000" }),
				-6,
			),
			2,
		),
		40,
	);
}

if (mode === "fetch") await fetchAll();
else build();
