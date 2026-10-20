/**
 * Imperative particle API, callable from anywhere on the client:
 *
 *   import { fx } from "@/fx";
 *   fx.burst("shards", cardEl, { palette: PALETTES.devour });
 *   fx.ring(cardEl, FX.blood);
 *   await fx.flyTo(potEl, lightCounterEl, { icon: "light", count: 10, onArrive: tick });
 *
 * Every call is a no-op when no <FxLayer/> is mounted, the tab is hidden, or
 * the player prefers reduced motion. Streams still honour their contract in
 * that case: every `onArrive` fires (on a microtask) and the promise resolves,
 * so counters that tick on arrival never get stuck.
 */
import { engine, glowSprite, type Particle, SHAPE, Target } from "./engine";
import { FX, type FxPalette, PALETTES } from "./palette";

export type Point = { x: number; y: number };
/** A viewport point (client px) or an element (its bounding-box centre). */
export type At = Point | Element;

export type BurstKind =
	| "embers"
	| "shards"
	| "kindle"
	| "sparkle"
	| "ash"
	| "unlock";

export type Rarity = "common" | "rare" | "relic";

export type BurstOpts = {
	/** Particle count (defaults per kind). Scaled by `amount`. */
	count?: number;
	/** Multiplier on the default count, e.g. 0.5 for a small hit. */
	amount?: number;
	/** Multiplier on size and speed. */
	scale?: number;
	/** Colours to pick from. */
	palette?: FxPalette;
	/** Radius (px) the burst is born across; elements default to their box. */
	spread?: number;
	/** Main direction in radians (0 = right, -PI/2 = up). Omit for radial. */
	angle?: number;
	/** Cone width in radians around `angle`. */
	cone?: number;
	/** Sparkle only. */
	rarity?: Rarity;
	/** Seconds before it starts. */
	delay?: number;
};

export type StreamOpts = {
	count?: number;
	color?: string;
	/** Seconds each mote takes to fly (about). */
	duration?: number;
	/** Called once per mote as it lands (index 0..count-1). */
	onArrive?: (i: number) => void;
	/** Scatter (px) around the source. */
	spread?: number;
	/** Seconds between launches; defaults to fit the burst in ~0.45 s. */
	stagger?: number;
	/** Mote radius (px). */
	size?: number;
	/** Small flash where each mote lands. */
	pop?: boolean;
	/** Draw solid (ash) instead of additive light. */
	solid?: boolean;
};

export type RingOpts = {
	/** Final radius in px. */
	radius?: number;
	/** Starting stroke width in px. */
	width?: number;
	/** Seconds. */
	duration?: number;
	delay?: number;
};

export type FlyOpts = {
	icon: "ash" | "light";
	count?: number;
	duration?: number;
	onArrive?: (i: number) => void;
};

// ---- helpers ----

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: readonly T[], fallback: T): T =>
	xs[Math.floor(Math.random() * xs.length)] ?? fallback;
const TAU = Math.PI * 2;

/** Size unit: 1 at the 390 px design width, clamped for desktop. */
function unit(): number {
	if (typeof window === "undefined") return 1;
	const m = Math.min(window.innerWidth, window.innerHeight);
	return Math.min(1.5, Math.max(0.8, m / 390));
}

type Box = { x: number; y: number; w: number; h: number };

function resolve(at: At): Box {
	if (typeof Element !== "undefined" && at instanceof Element) {
		const r = at.getBoundingClientRect();
		return {
			x: r.left + r.width / 2,
			y: r.top + r.height / 2,
			w: r.width,
			h: r.height,
		};
	}
	const p = at as Point;
	return { x: p.x, y: p.y, w: 0, h: 0 };
}

/** Random point in a disc of radius r. */
function jitter(r: number): [number, number] {
	if (r <= 0) return [0, 0];
	const a = Math.random() * TAU;
	const d = Math.sqrt(Math.random()) * r;
	return [Math.cos(a) * d, Math.sin(a) * d];
}

function direction(o: BurstOpts, defAngle: number, defCone: number): number {
	const ang = o.angle ?? defAngle;
	const cone = o.cone ?? (o.angle === undefined ? defCone : 0.9);
	return ang + (Math.random() - 0.5) * cone;
}

/** Random convex polygon (3 to 5 points) in unit space; long, thin, jagged. */
function shardVerts(p: Particle): void {
	const n = Math.random() < 0.55 ? 3 : Math.random() < 0.7 ? 4 : 5;
	const stretch = rand(1.2, 2.2);
	const base = Math.random() * TAU;
	for (let j = 0; j < n; j++) {
		const a = base + (j / n) * TAU + rand(-0.35, 0.35);
		const r = rand(0.55, 1);
		p.verts[j * 2] = Math.cos(a) * r * stretch;
		p.verts[j * 2 + 1] = Math.sin(a) * r;
	}
	p.nv = n;
}

function fleckVerts(p: Particle): void {
	const n = 4;
	for (let j = 0; j < n; j++) {
		const a = (j / n) * TAU + rand(-0.4, 0.4);
		const r = rand(0.6, 1);
		p.verts[j * 2] = Math.cos(a) * r * 1.4;
		p.verts[j * 2 + 1] = Math.sin(a) * r * 0.8;
	}
	p.nv = n;
}

function countOf(o: BurstOpts, def: number): number {
	const n = Math.round((o.count ?? def) * (o.amount ?? 1));
	return Math.max(0, Math.min(200, n));
}

function born(p: Particle, b: Box, o: BurstOpts, defSpread: number): void {
	const sp = o.spread ?? (b.w ? Math.min(b.w, b.h) * 0.3 : defSpread);
	const [dx, dy] = jitter(sp);
	p.x = b.x + dx;
	p.y = b.y + dy;
	p.delay = o.delay ?? 0;
}

// ---- recipes ----

function embers(b: Box, o: BurstOpts): void {
	const e = engine();
	if (!e) return;
	const u = unit() * (o.scale ?? 1);
	const pal = o.palette ?? PALETTES.embers;
	const n = countOf(o, 26);
	for (let i = 0; i < n; i++) {
		const p = e.spawn();
		if (!p) break;
		born(p, b, o, 10 * u);
		const a = direction(o, -Math.PI / 2, 2.6);
		const v = rand(60, 230) * u;
		p.vx = Math.cos(a) * v;
		p.vy = Math.sin(a) * v;
		p.ay = -50 * u;
		p.drag = 1.7;
		p.wob = rand(10, 30) * u;
		p.wobF = rand(3, 7);
		p.wobP = Math.random() * TAU;
		p.flick = rand(14, 26);
		p.life = rand(0.8, 1.7);
		p.color = pick(pal, FX.ember);
		if (Math.random() < 0.45) {
			p.shape = SHAPE.spark;
			p.size = rand(1.2, 2.2) * u;
			p.size1 = 0.4 * u;
			p.w = rand(0.8, 1.4);
		} else {
			p.shape = SHAPE.dot;
			p.sprite = glowSprite(p.color);
			p.size = rand(1.4, 2.8) * u;
			p.size1 = 0.5 * u;
		}
	}
	e.kick();
}

function shards(b: Box, o: BurstOpts): void {
	const e = engine();
	if (!e) return;
	const u = unit() * (o.scale ?? 1);
	const pal = o.palette ?? PALETTES.glass;
	const n = countOf(o, 18);
	for (let i = 0; i < n; i++) {
		const p = e.spawn();
		if (!p) break;
		born(p, b, o, 8 * u);
		p.shape = SHAPE.shard;
		p.add = false;
		const a = direction(o, -Math.PI / 2, TAU);
		const v = rand(160, 440) * u;
		p.vx = Math.cos(a) * v;
		p.vy = Math.sin(a) * v - 90 * u;
		p.ay = 980 * u;
		p.drag = 0.9;
		p.rot = Math.random() * TAU;
		p.vr = rand(-14, 14);
		p.life = rand(0.7, 1.25);
		p.size = rand(3.5, 10) * u;
		p.size1 = p.size * 0.7;
		p.a0 = 0.95;
		p.color = pick(pal, FX.glassBlue);
		shardVerts(p);
	}
	// A few hot specks where the glass gives.
	for (let i = 0; i < Math.ceil(n / 3); i++) {
		const p = e.spawn();
		if (!p) break;
		born(p, b, o, 6 * u);
		p.shape = SHAPE.spark;
		const a = Math.random() * TAU;
		const v = rand(200, 420) * u;
		p.vx = Math.cos(a) * v;
		p.vy = Math.sin(a) * v;
		p.drag = 4;
		p.life = rand(0.25, 0.45);
		p.size = rand(1, 1.8) * u;
		p.size1 = 0.3;
		p.w = 1.4;
		p.color = FX.bone;
	}
	e.kick();
}

function kindle(b: Box, o: BurstOpts): void {
	const e = engine();
	if (!e) return;
	const u = unit() * (o.scale ?? 1);
	const pal = o.palette ?? PALETTES.gilt;
	const n = countOf(o, 22);
	for (let i = 0; i < n; i++) {
		const p = e.spawn();
		if (!p) break;
		born(p, b, o, 26 * u);
		p.delay += rand(0, 0.25);
		p.shape = SHAPE.dot;
		const a = direction(o, -Math.PI / 2, 0.9);
		const v = rand(30, 95) * u;
		p.vx = Math.cos(a) * v;
		p.vy = Math.sin(a) * v;
		p.ay = -24 * u;
		p.drag = 0.7;
		p.wob = rand(8, 22) * u;
		p.wobF = rand(1.5, 3.5);
		p.wobP = Math.random() * TAU;
		p.fadeIn = 0.25;
		p.life = rand(1.2, 2.2);
		p.size = rand(2, 4.5) * u;
		p.size1 = p.size * 0.5;
		p.a0 = 0.9;
		p.color = pick(pal, FX.gilt);
		p.sprite = glowSprite(p.color);
	}
	e.kick();
}

const RARITY: Record<
	Rarity,
	{ n: number; life: number; size: number; pal: FxPalette; ring: boolean }
> = {
	common: {
		n: 6,
		life: 0.7,
		size: 1.6,
		pal: [FX.bone, FX.giltHi],
		ring: false,
	},
	rare: {
		n: 12,
		life: 0.9,
		size: 2,
		pal: [FX.giltHi, FX.glassCyan, FX.bone, FX.glassJade],
		ring: false,
	},
	relic: {
		n: 22,
		life: 1.2,
		size: 2.6,
		pal: [FX.gilt, FX.giltWhite, FX.emberHi, FX.giltHi],
		ring: true,
	},
};

function sparkle(b: Box, o: BurstOpts): void {
	const e = engine();
	if (!e) return;
	const u = unit() * (o.scale ?? 1);
	const r = RARITY[o.rarity ?? "rare"];
	const pal = o.palette ?? r.pal;
	const n = countOf(o, r.n);
	// Glints are scattered across the element (or a 40 px patch).
	const hw = b.w ? b.w * 0.5 : (o.spread ?? 40 * u);
	const hh = b.h ? b.h * 0.5 : (o.spread ?? 40 * u);
	for (let i = 0; i < n; i++) {
		const p = e.spawn();
		if (!p) break;
		p.x = b.x + rand(-hw, hw);
		p.y = b.y + rand(-hh, hh);
		p.delay = (o.delay ?? 0) + rand(0, r.life * 0.6);
		p.shape = SHAPE.star;
		p.vy = rand(-14, -4) * u;
		p.rot = rand(-0.2, 0.2);
		p.vr = rand(-0.6, 0.6);
		p.life = r.life * rand(0.7, 1.2);
		p.size = r.size * rand(0.7, 1.3) * u;
		p.size1 = p.size;
		p.color = pick(pal, FX.giltHi);
		p.sprite = glowSprite(p.color);
	}
	e.kick();
	if (r.ring) ring(b, FX.gilt, { radius: Math.max(b.w, b.h, 80) * 0.75 });
}

function ash(b: Box, o: BurstOpts): void {
	const e = engine();
	if (!e) return;
	const u = unit() * (o.scale ?? 1);
	const pal = o.palette ?? PALETTES.ash;
	const n = countOf(o, 24);
	for (let i = 0; i < n; i++) {
		const p = e.spawn();
		if (!p) break;
		born(p, b, o, 14 * u);
		p.shape = SHAPE.fleck;
		p.add = false;
		const a = direction(o, -Math.PI / 2, 2.4);
		const v = rand(40, 170) * u;
		p.vx = Math.cos(a) * v;
		p.vy = Math.sin(a) * v;
		p.ay = 70 * u;
		p.drag = 2.4;
		p.wob = rand(14, 36) * u;
		p.wobF = rand(2, 4);
		p.wobP = Math.random() * TAU;
		p.rot = Math.random() * TAU;
		p.vr = rand(-7, 7);
		p.life = rand(1.3, 2.3);
		p.size = rand(1.5, 3.4) * u;
		p.size1 = p.size * 0.6;
		p.a0 = 0.85;
		p.color = pick(pal, FX.ash);
		fleckVerts(p);
	}
	e.kick();
}

function unlock(b: Box, o: BurstOpts): void {
	const e = engine();
	if (!e) return;
	const u = unit() * (o.scale ?? 1);
	const pal = o.palette ?? PALETTES.gilt;
	const n = countOf(o, 36);
	const r0 = o.spread ?? (b.w ? Math.min(b.w, b.h) * 0.35 : 18 * u);
	const off = Math.random() * TAU;
	for (let i = 0; i < n; i++) {
		const p = e.spawn();
		if (!p) break;
		const a = off + (i / n) * TAU;
		p.x = b.x + Math.cos(a) * r0;
		p.y = b.y + Math.sin(a) * r0;
		p.delay = o.delay ?? 0;
		p.shape = SHAPE.spark;
		const v = rand(270, 330) * u;
		p.vx = Math.cos(a) * v;
		p.vy = Math.sin(a) * v;
		p.ay = 60 * u;
		p.drag = 3.2;
		p.life = rand(0.7, 1);
		p.size = rand(1.6, 2.4) * u;
		p.size1 = 0.4 * u;
		p.w = 1.6;
		p.color = pick(pal, FX.gilt);
	}
	e.kick();
	ring(b, FX.giltHi, {
		radius: r0 + 120 * u,
		width: 5 * u,
		duration: 0.6,
		delay: o.delay ?? 0,
	});
	kindle(b, { amount: 0.5, delay: (o.delay ?? 0) + 0.12, spread: r0 });
}

const RECIPES: Record<BurstKind, (b: Box, o: BurstOpts) => void> = {
	embers,
	shards,
	kindle,
	sparkle,
	ash,
	unlock,
};

// ---- public calls ----

function ring(b: Box, color: string = FX.gilt, o: RingOpts = {}): void {
	const e = engine();
	if (!e?.enabled) return;
	const u = unit();
	const p = e.spawn();
	if (!p) return;
	p.x = b.x;
	p.y = b.y;
	p.shape = SHAPE.ring;
	p.size = b.w ? Math.max(4, Math.min(b.w, b.h) * 0.25) : 6 * u;
	p.size1 = o.radius ?? 90 * u;
	p.w = o.width ?? 6 * u;
	p.life = o.duration ?? 0.55;
	p.delay = o.delay ?? 0;
	p.a0 = 0.9;
	p.color = color;
	e.kick();
}

function burst(kind: BurstKind, at: At, opts: BurstOpts = {}): void {
	const e = engine();
	if (!e?.enabled) return;
	RECIPES[kind](resolve(at), opts);
}

function settle(count: number, onArrive?: (i: number) => void): Promise<void> {
	return new Promise((done) => {
		queueMicrotask(() => {
			if (onArrive) for (let i = 0; i < count; i++) onArrive(i);
			done();
		});
	});
}

function stream(from: At, to: At, o: StreamOpts = {}): Promise<void> {
	const count = Math.max(0, Math.min(120, Math.round(o.count ?? 12)));
	const e = engine();
	if (!e?.enabled || count === 0) return settle(count, o.onArrive);
	const u = unit();
	const a = resolve(from);
	const toBox = resolve(to);
	const tgt = new Target(
		toBox.x,
		toBox.y,
		typeof Element !== "undefined" && to instanceof Element ? to : null,
	);
	const color = o.color ?? FX.gilt;
	const sprite = glowSprite(color);
	const dur = o.duration ?? 0.9;
	const stagger = o.stagger ?? Math.min(0.06, 0.45 / count);
	const spread = o.spread ?? (a.w ? Math.min(a.w, a.h) * 0.3 : 16 * u);
	const dx = toBox.x - a.x;
	const dy = toBox.y - a.y;
	const dist = Math.hypot(dx, dy) || 1;
	// Unit normal to the flight line; motes bow to either side of it.
	const nx = -dy / dist;
	const ny = dx / dist;
	const pop = o.pop ?? true;

	return new Promise((done) => {
		let left = count;
		const land = (i: number, x: number, y: number) => {
			try {
				o.onArrive?.(i);
			} finally {
				if (pop) landPop(x, y, color, o.solid ?? false);
				left--;
				if (left === 0) done();
			}
		};
		for (let i = 0; i < count; i++) {
			const p = e.spawn();
			if (!p) {
				queueMicrotask(() => land(i, tgt.x, tgt.y));
				continue;
			}
			const [jx, jy] = jitter(spread);
			p.shape = SHAPE.mote;
			p.add = !o.solid;
			p.sx = p.x = p.px = a.x + jx;
			p.sy = p.y = p.py = a.y + jy;
			const bow = rand(-0.45, 0.45) * dist;
			p.cx = (p.sx + toBox.x) / 2 + nx * bow;
			p.cy = (p.sy + toBox.y) / 2 + ny * bow - dist * 0.15;
			p.delay = i * stagger;
			p.life = dur * rand(0.85, 1.15);
			p.fadeIn = 0.12;
			p.size = (o.size ?? 3.2) * u * rand(0.8, 1.2);
			p.size1 = p.size * 0.7;
			p.a0 = 1.4; // overshoot so the tail of the fade still reads
			p.color = color;
			p.sprite = sprite;
			e.aim(p, tgt);
			const idx = i;
			p.arrive = () => land(idx, tgt.x, tgt.y);
		}
		e.kick();
	});
}

/** Tiny flash where a mote lands. */
function landPop(x: number, y: number, color: string, solid: boolean): void {
	const e = engine();
	if (!e?.enabled) return;
	const u = unit();
	for (let i = 0; i < 3; i++) {
		const p = e.spawn();
		if (!p) return;
		p.x = x;
		p.y = y;
		p.shape = solid ? SHAPE.fleck : SHAPE.spark;
		p.add = !solid;
		const a = Math.random() * TAU;
		const v = rand(60, 140) * u;
		p.vx = Math.cos(a) * v;
		p.vy = Math.sin(a) * v;
		p.drag = 5;
		p.life = rand(0.18, 0.32);
		p.size = rand(1, 1.6) * u;
		p.size1 = 0.3;
		p.w = 1.2;
		p.color = color;
		if (solid) {
			p.rot = Math.random() * TAU;
			fleckVerts(p);
		}
	}
	e.kick();
}

/** Light or Ash flying from one element into another (a counter). */
function flyTo(fromEl: At, toEl: At, o: FlyOpts): Promise<void> {
	const light = o.icon === "light";
	const s: StreamOpts = {
		count: o.count ?? 10,
		color: light ? FX.gilt : FX.ashL,
		duration: o.duration ?? (light ? 0.85 : 1),
		size: light ? 3.4 : 2.6,
		solid: !light,
	};
	if (o.onArrive) s.onArrive = o.onArrive;
	return stream(fromEl, toEl, s);
}

export const fx = {
	/** One-shot effect at a point or element. */
	burst,
	/** Motes flowing along curves from `from` to `to`; resolves when all land. */
	stream,
	/** Shockwave ring. */
	ring: (at: At, color?: string, opts?: RingOpts) =>
		ring(resolve(at), color, opts),
	/** Light / Ash into a counter. */
	flyTo,
	/** True when calls will actually draw (layer mounted, visible, motion OK). */
	get enabled(): boolean {
		return engine()?.enabled ?? false;
	},
	/** Live particle count (for the demo / budget checks). */
	get live(): number {
		return engine()?.count ?? 0;
	},
	/** Stop everything now (owed stream arrivals fire immediately). */
	clear: () => engine()?.flush(),
} as const;
