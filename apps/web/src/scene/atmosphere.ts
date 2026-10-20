/**
 * The atmosphere: post-processing for the scene layer (never the UI). The ink world is DOM images
 * and canvases, so nothing here reads the page back; the light is rebuilt from what the shared
 * lens (lens.js) already rendered plus the light sources the scenes register (emitters.js), and
 * laid over the scene with CSS blend modes, under every word.
 *
 *   <Atmosphere />                    mount inside a scene, after its layers, before any UI
 *   ?fx=off|balanced|rich             compare presets on any page that mounts it
 *   ?fxbloom=1.3&fxgrain=0            nudge one strength on top of the preset (live tuning)
 *
 * The look is built around the light emitters, not the shafts:
 *   glass   the lit windows (found by their lens taps; GlassWindow and the stages also register
 *           them): a soft halo on the stone around the glass (never over it), a faint coloured
 *           rim on the arch, and their colour washing the floor below
 *   candle  a tight hot core and a wide warm halo, a gentle per-candle flicker (smooth noise
 *           under 2 Hz, +-7%: no strobing), warm light pooled on the wall and the floor, embers
 *   ember   mask eyes: a small hot bloom and a faint red spill on what is around them
 *   gilt    sparse slow glints on gilded studs and mouldings
 *   rays    god-ray shafts from the glass, capped at the old "subtle" strength (RAYS_CAP)
 *   motes   dust drifting through the shafts and the candle light, very faint motes in the dark
 *   grade   warm highlights (soft-light) over cool umber shadows (lift); vignette; fine grain
 *
 * Layers, low to high, inside the scene's own stacking context:
 *   light  canvas, mix-blend screen   rays, bloom, emitters, spill, particles, shadow lift
 *                                     (premultiplied, alpha = brightest channel: safe over
 *                                     transparent scene areas)
 *   tint   div, mix-blend soft-light  warm highlights (only when the scene is opaque: `opaque`)
 *   shade  div, normal (black alpha)  vault darkness and vignette (CSS gradients)
 *   grain  div, mix-blend overlay     a 128 px noise tile jumped about by a compositor animation
 * Tint, shade and grain are plain CSS, so they stay (and cost no shader) without WebGL2.
 *
 * GPU passes per frame, on the ONE shared lens context, at 30 fps, only while on screen and the
 * page is visible (the lens's clock). Sizes for a 390 x 844 phone at DPR 3 (out = 0.5 x min(DPR,2)
 * of the CSS box, capped at 520k px):
 *   0  tap      each lit window's own frame, blitted GPU-side to <= 128 px      (lens.tap)
 *   1  mask     taps drawn into the light mask (rgb light, a coverage)   195 x 422, 1 fetch
 *   2  avg      each window's mean colour (4 x 1 target, 16 taps each)     4 x 1, 16 fetches
 *   3  rays 1   radial blur toward the light, 32 samples, decaying      195 x 422, 32 fetches
 *   4  rays 2   the same along one step of pass 3, 8 samples (no banding) 195 x 422, 8 fetches
 *   5  bloom    downsample + soft threshold                              98 x 211, 4 fetches
 *   6-9 blur    separable 9-tap gaussian (5 linear fetches), H V H V     98 x 211, 5 fetches each
 *   10 compose  rays + glass halo/rim/spill + emitters + particles       390 x 844, 15 fetches
 *               (rays 1, bloom 1, mask 1 + 8 for the rim, 1 texelFetch per window <= 4).
 *               Emitters are analytic: <= 12 points, each skipped beyond its reach (a candle's
 *               light reaches 3.2 radii); 3 embers per candle and two grids of dust motes are
 *               hashed cells: no geometry, no extra pass, no new context.
 * Passes 3-4 are skipped when the rays and the shaft dust are off.
 * About 8M texture fetches and ~0.75M pixels written a frame. Verified headless (Chrome,
 * SwiftShader) 2026-10-20: every pass compiles and draws; "off" draws nothing. The pre-rebalance pipeline (same
 * passes minus avg, 10 fetches in compose) measured 0.25 ms median / 0.4 ms p90 on an RTX 4050
 * laptop (EXT_disjoint_timer_query, 2026-10-20, 390 x 844 at DPR 3). The emitter loop adds
 * ALU only (about 60 flops per pixel near a candle, a compare elsewhere): estimated 1-1.5 ms on a
 * mid phone (Adreno 6xx class) at this size, inside the 2 ms budget. Not yet re-measured.
 * Reduced motion: one still frame (redrawn when the glass or an emitter changes), no flicker,
 * no embers, no dust, no grain.
 */

export type AtmosphereName = "off" | "balanced" | "rich";

/** Strengths, 1 = the designed look. Each multiplies a constant in BASE. */
export interface AtmosphereLook {
	/** God rays from the lit glass (capped at RAYS_CAP: they must never dominate). */
	rays: number;
	/** Halos on every emitter: glass on the stone, candle flames, ember eyes, gilt glints. */
	bloom: number;
	/** Candle light: warm pools on the wall and the floor around each flame. */
	candle: number;
	/** Glass spill: the windows' colour on the floor below and on the arch stonework. */
	spill: number;
	/** Dust in the shafts and the candle light, and the faint motes in the dark. */
	motes: number;
	/** Sparks rising from the candles. */
	embers: number;
	/** Darkness gathered in the vault. */
	haze: number;
	/** Shadows lifted to cool umber, highlights tipped to warm gilt. */
	grade: number;
	/** Corners sinking into the dark. */
	vignette: number;
	/** Fine moving film grain (about 1-2% of luma at 1). */
	grain: number;
}

/**
 * The most the shafts may ever get, whatever the preset or URL: 1 = the old "subtle" preset
 * (0.55 of the first designed strength), which the owner judged the limit.
 */
export const RAYS_CAP = 1;

export const ATMOSPHERES: Record<AtmosphereName, AtmosphereLook> = {
	off: {
		rays: 0,
		bloom: 0,
		candle: 0,
		spill: 0,
		motes: 0,
		embers: 0,
		haze: 0,
		grade: 0,
		vignette: 0,
		grain: 0,
	},
	balanced: {
		rays: 0.8,
		bloom: 1,
		candle: 1,
		spill: 1,
		motes: 1,
		embers: 1,
		haze: 0.8,
		grade: 0.9,
		vignette: 0.75,
		grain: 0.8,
	},
	rich: {
		rays: 1,
		bloom: 1.35,
		candle: 1.35,
		spill: 1.4,
		motes: 1.25,
		embers: 1.5,
		haze: 1,
		grade: 1.2,
		vignette: 0.95,
		grain: 1,
	},
};

/** Older preset names (links in notes and tickets) and what they open now. */
const ALIASES: Record<string, AtmosphereName> = {
	subtle: "balanced",
	atmospheric: "balanced",
	heavy: "rich",
};

/** The shipped preset. */
export const ATMOSPHERE_PRESET: AtmosphereName = "balanced";

/** What a strength of 1 means. Shader constants live here so tuning never touches GLSL. */
export const BASE = {
	/** Ray gain into the screen layer, after the radial average (= the old subtle: 0.55 x 6). */
	rays: 3.3,
	/** How far toward the light each pixel looks, as a share of its distance to it. */
	rayReach: 0.55,
	/** Per-sample falloff along a ray (0.97^32 = 0.38: shafts fade toward the floor). */
	rayDecay: 0.97,
	/** Slow drift of brighter and dimmer bands across the shafts (0 = still). */
	shimmer: 0.35,

	/** Glass bloom: gain and soft threshold on the light mask (glass colour squared). */
	bloom: 1.5,
	bloomThreshold: 0.06,
	bloomKnee: 0.22,
	/** How much of the glass bloom survives over the glass itself (0 = only on the stone). */
	bloomOnGlass: 0.12,
	/** Glass with no shader (registered, not tapped): its analytic halo, in its own colour. */
	glassHalo: 0.22,

	/** Candle flame: hot core and warm halo gains; their radii as shares of the emitter radius. */
	flameCore: 0.95,
	flameCoreR: 0.14,
	flameHalo: 0.45,
	flameHaloR: 0.6,
	/** Candle light on the stone: a wide soft gradient on the wall, an ellipse on the floor. */
	candleWall: 0.1,
	candleFloor: 0.14,
	/** Candle light's reach, in emitter radii (nothing is computed past it). */
	candleReach: 3.2,
	/** Flicker depth (smooth noise, under 2 Hz). */
	flicker: 0.07,

	/** Ember eyes: hot core and red spill gains; radii as shares of the emitter radius. */
	emberCore: 0.6,
	emberCoreR: 0.3,
	emberSpill: 0.09,
	/** Gilt glints: peak gain, and how often (glints per emitter per minute, roughly). */
	gilt: 0.85,
	giltRate: 5,

	/** Glass spill on the floor below a window (share of its mean colour) and its depth. */
	spill: 0.16,
	spillDepth: 0.22,
	/** Coloured rim on the arch stonework hugging the glass. */
	rim: 0.5,

	/** Darkness at the top of the vault (multiply alpha at the very top). */
	vault: 0.5,
	/** Shadow lift, added (screen) as linear RGB: a cool umber. */
	lift: [0.018, 0.015, 0.024] as const,
	/** Warm highlights: a soft-light colour (0.5 grey = untouched) at strength 1. */
	warm: [0.57, 0.53, 0.45] as const,
	/** Vignette darkness at the far corners (multiply alpha). */
	vignette: 0.55,
	/** Grain layer opacity (overlay blend; noise sigma ~0.15 around mid grey). */
	grain: 0.06,

	/** Dust: brightness in the shafts, cell size and radius in CSS px. */
	motes: 3.6,
	moteCell: 30,
	moteRadius: 1.1,
	/** Dust lit by candle light, and the faint motes in the unlit dark. */
	moteCandle: 2.2,
	moteDark: 0.012,
	/** Embers per candle in flight at once, their rise (emitter radii) and life (s). */
	embers: 3,
	emberRise: 2.4,
	emberLife: 3.2,
};

/** The query parameter that picks a preset for comparison. */
export const FX_PARAM = "fx";

const KEYS = [
	"rays",
	"bloom",
	"candle",
	"spill",
	"motes",
	"embers",
	"haze",
	"grade",
	"vignette",
	"grain",
] as const;

const nameOf = (v: string | null): AtmosphereName | null => {
	if (v === null) return null;
	if (v in ATMOSPHERES) return v as AtmosphereName;
	return ALIASES[v] ?? null;
};

/** Hold every look to the caps (rays). */
export function capped(l: AtmosphereLook): AtmosphereLook {
	return { ...l, rays: Math.min(RAYS_CAP, Math.max(0, l.rays)) };
}

/**
 * The look for this page: `?fx=<preset>` (else `fallback`), then any `?fx<key>=<n>` override.
 * Call on the client only (it reads the query string you pass it).
 */
export function atmosphereFromSearch(
	search: string,
	fallback: AtmosphereName = ATMOSPHERE_PRESET,
): AtmosphereLook {
	const q = new URLSearchParams(search);
	const look = { ...ATMOSPHERES[nameOf(q.get(FX_PARAM)) ?? fallback] };
	for (const k of KEYS) {
		const v = q.get(`${FX_PARAM}${k}`);
		if (v === null) continue;
		const n = Number.parseFloat(v);
		if (Number.isFinite(n)) look[k] = Math.max(0, Math.min(4, n));
	}
	return capped(look);
}

/** True when the look needs the GPU (anything the shader layer draws). */
export const needsLight = (l: AtmosphereLook) =>
	l.rays > 0 ||
	l.bloom > 0 ||
	l.candle > 0 ||
	l.spill > 0 ||
	l.motes > 0 ||
	l.embers > 0 ||
	l.grade > 0;
