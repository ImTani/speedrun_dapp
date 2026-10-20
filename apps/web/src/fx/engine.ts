/**
 * The particle engine: one full-screen 2D canvas, a fixed pool of particles,
 * and a rAF loop that only runs while something is alive.
 *
 * Budget rules (the owner's phone matters, his PC runs hot):
 * - fixed pool (MAX), no allocation per frame, spawns past the cap are dropped;
 * - DPR capped at 2;
 * - the canvas is hidden and the loop stopped whenever nothing is alive;
 * - paused (and flushed) while the document is hidden;
 * - off entirely under prefers-reduced-motion.
 *
 * Nothing here is React. <FxLayer/> attaches a canvas; `fx` (./api) spawns.
 */

export const MAX = 600;
const DPR_CAP = 2;
const DT_CAP = 1 / 20;

/** How a particle is drawn and moved. */
export const SHAPE = {
	/** Soft glow sprite. */
	dot: 0,
	/** Streak along its velocity. */
	spark: 1,
	/** Angular glass polygon with a glint. */
	shard: 2,
	/** Expanding stroked circle. */
	ring: 3,
	/** Tumbling flat fleck (ash). */
	fleck: 4,
	/** Follows a curve to a target, then calls back. */
	mote: 5,
	/** Four-point twinkle. */
	star: 6,
} as const;
export type Shape = (typeof SHAPE)[keyof typeof SHAPE];

/** A point that may track an element (re-read once per frame). */
export class Target {
	x: number;
	y: number;
	el: Element | null;
	/** Live motes heading here. */
	refs = 0;
	constructor(x: number, y: number, el: Element | null) {
		this.x = x;
		this.y = y;
		this.el = el;
	}
}

export class Particle {
	live = false;
	shape: Shape = SHAPE.dot;
	add = true;
	x = 0;
	y = 0;
	vx = 0;
	vy = 0;
	ax = 0;
	ay = 0;
	drag = 0;
	delay = 0;
	age = 0;
	life = 1;
	size = 1;
	size1 = 1;
	/** Ring stroke width / spark length factor. */
	w = 1;
	rot = 0;
	vr = 0;
	a0 = 1;
	fadeIn = 0;
	/** Sideways sway, px/s amplitude, rad/s frequency, phase. */
	wob = 0;
	wobF = 0;
	wobP = 0;
	/** Flicker speed (rad/s); 0 = steady. */
	flick = 0;
	color = "#fff";
	sprite: HTMLCanvasElement | null = null;
	/** Shard / fleck outline, unit space. */
	readonly verts = new Float32Array(10);
	nv = 0;
	// Mote path.
	sx = 0;
	sy = 0;
	cx = 0;
	cy = 0;
	px = 0;
	py = 0;
	target: Target | null = null;
	arrive: (() => void) | null = null;
}

const glowCache = new Map<string, HTMLCanvasElement>();

/** Radial glow sprite for a colour: hot core, coloured halo, soft edge. */
export function glowSprite(color: string): HTMLCanvasElement | null {
	const hit = glowCache.get(color);
	if (hit) return hit;
	if (typeof document === "undefined") return null;
	const S = 48;
	const c = document.createElement("canvas");
	c.width = S;
	c.height = S;
	const g = c.getContext("2d");
	if (!g) return null;
	const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
	grad.addColorStop(0, "#fffaf0");
	grad.addColorStop(0.18, color);
	grad.addColorStop(0.45, `${color}55`);
	grad.addColorStop(1, `${color}00`);
	g.fillStyle = grad;
	g.fillRect(0, 0, S, S);
	glowCache.set(color, c);
	return c;
}

const easeOut = (k: number) => 1 - (1 - k) ** 3;
const easeInOut = (k: number) =>
	k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;

export class Engine {
	readonly pool: Particle[] = [];
	private readonly free: number[] = [];
	private alive = 0;
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private dpr = 1;
	private raf = 0;
	private last = 0;
	private reduce = false;
	private hidden = false;
	private shown = false;
	private readonly targets = new Set<Target>();
	private mq: MediaQueryList | null = null;
	private readonly cleanups: (() => void)[] = [];

	constructor() {
		for (let i = 0; i < MAX; i++) {
			this.pool.push(new Particle());
			this.free.push(MAX - 1 - i);
		}
	}

	get enabled(): boolean {
		return this.ctx !== null && !this.reduce && !this.hidden;
	}

	get count(): number {
		return this.alive;
	}

	attach(canvas: HTMLCanvasElement): void {
		if (this.canvas === canvas) return;
		this.detach();
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		this.canvas = canvas;
		this.ctx = ctx;
		canvas.style.visibility = "hidden";
		this.shown = false;

		const onResize = () => this.resize();
		window.addEventListener("resize", onResize);
		window.visualViewport?.addEventListener("resize", onResize);
		this.cleanups.push(() => {
			window.removeEventListener("resize", onResize);
			window.visualViewport?.removeEventListener("resize", onResize);
		});

		const onVis = () => {
			this.hidden = document.hidden;
			if (this.hidden) this.flush();
		};
		document.addEventListener("visibilitychange", onVis);
		this.cleanups.push(() =>
			document.removeEventListener("visibilitychange", onVis),
		);
		this.hidden = document.hidden;

		this.mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const onMq = () => {
			this.reduce = this.mq?.matches ?? false;
			if (this.reduce) this.flush();
		};
		this.mq.addEventListener("change", onMq);
		this.cleanups.push(() => this.mq?.removeEventListener("change", onMq));
		this.reduce = this.mq.matches;

		this.resize();
	}

	detach(canvas?: HTMLCanvasElement): void {
		if (canvas && canvas !== this.canvas) return;
		this.flush();
		for (const c of this.cleanups.splice(0)) c();
		this.canvas = null;
		this.ctx = null;
		this.mq = null;
	}

	private resize(): void {
		const c = this.canvas;
		if (!c) return;
		this.dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
		const w = window.innerWidth;
		const h = window.innerHeight;
		c.width = Math.max(1, Math.round(w * this.dpr));
		c.height = Math.max(1, Math.round(h * this.dpr));
		// Size in px, not vh: matches the client coordinates we draw in.
		c.style.width = `${w}px`;
		c.style.height = `${h}px`;
	}

	/** A free particle, reset; null when the pool is full or fx are off. */
	spawn(): Particle | null {
		if (!this.enabled) return null;
		const i = this.free.pop();
		if (i === undefined) return null;
		const p = this.pool[i];
		if (!p) return null;
		p.live = true;
		p.shape = SHAPE.dot;
		p.add = true;
		p.vx = p.vy = p.ax = p.ay = p.drag = 0;
		p.delay = p.age = 0;
		p.life = 1;
		p.size = p.size1 = 1;
		p.w = 1;
		p.rot = p.vr = 0;
		p.a0 = 1;
		p.fadeIn = 0;
		p.wob = p.wobF = p.wobP = 0;
		p.flick = 0;
		p.sprite = null;
		p.nv = 0;
		p.target = null;
		p.arrive = null;
		this.alive++;
		return p;
	}

	/** Aim a spawned mote at `t`; element targets are followed while it flies. */
	aim(p: Particle, t: Target): void {
		p.target = t;
		t.refs++;
		if (t.el) this.targets.add(t);
	}

	/** Start the loop (call after spawning). */
	kick(): void {
		if (this.raf || !this.ctx || this.alive === 0) return;
		if (!this.shown && this.canvas) {
			this.canvas.style.visibility = "visible";
			this.shown = true;
		}
		this.last = performance.now();
		this.raf = requestAnimationFrame(this.tick);
	}

	/** Kill everything now; motes still owed an arrival get it immediately. */
	flush(): void {
		if (this.raf) cancelAnimationFrame(this.raf);
		this.raf = 0;
		const owed: (() => void)[] = [];
		for (let i = 0; i < MAX; i++) {
			const p = this.pool[i];
			if (!p?.live) continue;
			if (p.arrive) owed.push(p.arrive);
			this.kill(p, i);
		}
		this.targets.clear();
		this.blank();
		for (const f of owed) {
			try {
				f();
			} catch (err) {
				console.error(err);
			}
		}
	}

	private kill(p: Particle, i: number): void {
		p.live = false;
		p.arrive = null;
		const t = p.target;
		if (t && --t.refs <= 0) this.targets.delete(t);
		p.target = null;
		p.sprite = null;
		this.free.push(i);
		this.alive--;
	}

	private blank(): void {
		const { ctx, canvas } = this;
		if (ctx && canvas) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
		if (canvas && this.shown) {
			canvas.style.visibility = "hidden";
			this.shown = false;
		}
	}

	// `raf` stays non-zero for the whole tick, so spawns made by arrival
	// callbacks (kick) cannot schedule a second loop.
	private readonly tick = (now: number): void => {
		const dt = Math.min(DT_CAP, Math.max(0, (now - this.last) / 1000));
		this.last = now;
		this.refreshTargets();
		const arrivals = this.step(dt);
		this.draw();
		for (const f of arrivals) {
			try {
				f();
			} catch (err) {
				console.error(err);
			}
		}
		if (this.alive > 0 && this.enabled) {
			this.raf = requestAnimationFrame(this.tick);
		} else {
			this.raf = 0;
			this.targets.clear();
			this.blank();
		}
	};

	private refreshTargets(): void {
		for (const t of this.targets) {
			const el = t.el;
			if (!el?.isConnected) {
				this.targets.delete(t);
				continue;
			}
			const r = el.getBoundingClientRect();
			t.x = r.left + r.width / 2;
			t.y = r.top + r.height / 2;
		}
	}

	private step(dt: number): (() => void)[] {
		const out: (() => void)[] = [];
		for (let i = 0; i < MAX; i++) {
			const p = this.pool[i];
			if (!p?.live) continue;
			if (p.delay > 0) {
				p.delay -= dt;
				continue;
			}
			p.age += dt;
			if (p.age >= p.life) {
				if (p.arrive) out.push(p.arrive);
				this.kill(p, i);
				continue;
			}
			p.rot += p.vr * dt;
			if (p.shape === SHAPE.mote) {
				const t = p.target;
				const k = easeInOut(p.age / p.life);
				const u = 1 - k;
				const tx = t ? t.x : p.sx;
				const ty = t ? t.y : p.sy;
				p.px = p.x;
				p.py = p.y;
				p.x = u * u * p.sx + 2 * u * k * p.cx + k * k * tx;
				p.y = u * u * p.sy + 2 * u * k * p.cy + k * k * ty;
				if (p.age <= dt) {
					p.px = p.x;
					p.py = p.y;
				}
				continue;
			}
			if (p.shape === SHAPE.ring) continue;
			p.vx += p.ax * dt;
			p.vy += p.ay * dt;
			if (p.drag > 0) {
				const d = Math.exp(-p.drag * dt);
				p.vx *= d;
				p.vy *= d;
			}
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			if (p.wob) p.x += Math.sin(p.age * p.wobF + p.wobP) * p.wob * dt;
		}
		return out;
	}

	private alpha(p: Particle, k: number): number {
		let a = p.a0 * (1 - k) ** 1.3;
		if (p.fadeIn > 0 && k < p.fadeIn) a *= k / p.fadeIn;
		if (p.flick) a *= 0.7 + 0.3 * Math.sin(p.age * p.flick + p.wobP);
		return a;
	}

	private draw(): void {
		const { ctx, canvas } = this;
		if (!ctx || !canvas) return;
		const dpr = this.dpr;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Pass 0: solid (shards, ash). Pass 1: light (additive).
		for (let pass = 0; pass < 2; pass++) {
			const additive = pass === 1;
			ctx.globalCompositeOperation = additive ? "lighter" : "source-over";
			for (let i = 0; i < MAX; i++) {
				const p = this.pool[i];
				if (!p?.live || p.delay > 0 || p.add !== additive) continue;
				const k = Math.min(1, p.age / p.life);
				const a = this.alpha(p, k);
				if (a <= 0.004) continue;
				const s = p.size + (p.size1 - p.size) * k;
				ctx.globalAlpha = Math.min(1, a);
				switch (p.shape) {
					case SHAPE.dot:
					case SHAPE.mote:
						this.drawGlow(ctx, p, s, dpr);
						break;
					case SHAPE.spark:
						this.drawSpark(ctx, p, s, dpr);
						break;
					case SHAPE.shard:
						this.drawShard(ctx, p, s, dpr, a);
						break;
					case SHAPE.ring:
						this.drawRing(ctx, p, k, dpr);
						break;
					case SHAPE.fleck:
						this.drawFleck(ctx, p, s, dpr);
						break;
					case SHAPE.star:
						this.drawStar(ctx, p, s, dpr, k);
						break;
				}
			}
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-over";
	}

	private drawGlow(
		ctx: CanvasRenderingContext2D,
		p: Particle,
		s: number,
		dpr: number,
	): void {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (p.shape === SHAPE.mote) {
			const dx = p.x - p.px;
			const dy = p.y - p.py;
			if (dx * dx + dy * dy > 1) {
				ctx.strokeStyle = p.color;
				ctx.lineWidth = s * 0.55;
				ctx.lineCap = "round";
				ctx.beginPath();
				ctx.moveTo(p.x - dx * 2.2, p.y - dy * 2.2);
				ctx.lineTo(p.x, p.y);
				ctx.stroke();
			}
		}
		const spr = p.sprite;
		if (spr) {
			const r = s * 2.2;
			ctx.drawImage(spr, p.x - r, p.y - r, r * 2, r * 2);
		} else {
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawSpark(
		ctx: CanvasRenderingContext2D,
		p: Particle,
		s: number,
		dpr: number,
	): void {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const len = 0.035 * p.w;
		ctx.strokeStyle = p.color;
		ctx.lineWidth = s;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(p.x - p.vx * len, p.y - p.vy * len);
		ctx.lineTo(p.x, p.y);
		ctx.stroke();
	}

	private drawShard(
		ctx: CanvasRenderingContext2D,
		p: Particle,
		s: number,
		dpr: number,
		a: number,
	): void {
		const c = Math.cos(p.rot) * s * dpr;
		const sn = Math.sin(p.rot) * s * dpr;
		ctx.setTransform(c, sn, -sn, c, p.x * dpr, p.y * dpr);
		const v = p.verts;
		ctx.beginPath();
		ctx.moveTo(v[0] ?? 0, v[1] ?? 0);
		for (let j = 1; j < p.nv; j++) ctx.lineTo(v[j * 2] ?? 0, v[j * 2 + 1] ?? 0);
		ctx.closePath();
		ctx.fillStyle = p.color;
		ctx.fill();
		// Lead edge catches the light; the face flashes as it turns.
		ctx.lineWidth = 0.14;
		ctx.strokeStyle = "#e9dcbc";
		ctx.beginPath();
		ctx.moveTo(v[0] ?? 0, v[1] ?? 0);
		ctx.lineTo(v[2] ?? 0, v[3] ?? 0);
		ctx.stroke();
		const glint = Math.max(0, Math.cos(p.rot * 1.7)) ** 8;
		if (glint > 0.05) {
			ctx.globalAlpha = Math.min(1, a * glint * 0.75);
			ctx.fillStyle = "#fffaf0";
			ctx.beginPath();
			ctx.moveTo(v[0] ?? 0, v[1] ?? 0);
			for (let j = 1; j < p.nv; j++)
				ctx.lineTo(v[j * 2] ?? 0, v[j * 2 + 1] ?? 0);
			ctx.closePath();
			ctx.fill();
		}
	}

	private drawRing(
		ctx: CanvasRenderingContext2D,
		p: Particle,
		k: number,
		dpr: number,
	): void {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const r = p.size + (p.size1 - p.size) * easeOut(k);
		ctx.strokeStyle = p.color;
		ctx.lineWidth = Math.max(0.5, p.w * (1 - k));
		ctx.beginPath();
		ctx.arc(p.x, p.y, Math.max(0.1, r), 0, Math.PI * 2);
		ctx.stroke();
	}

	private drawFleck(
		ctx: CanvasRenderingContext2D,
		p: Particle,
		s: number,
		dpr: number,
	): void {
		// Flutter: squash on one axis as it tumbles.
		const flat = 0.25 + 0.75 * Math.abs(Math.cos(p.rot * 1.3));
		const c = Math.cos(p.rot) * s * dpr;
		const sn = Math.sin(p.rot) * s * dpr;
		ctx.setTransform(c, sn, -sn * flat, c * flat, p.x * dpr, p.y * dpr);
		ctx.fillStyle = p.color;
		const v = p.verts;
		ctx.beginPath();
		ctx.moveTo(v[0] ?? 0, v[1] ?? 0);
		for (let j = 1; j < p.nv; j++) ctx.lineTo(v[j * 2] ?? 0, v[j * 2 + 1] ?? 0);
		ctx.closePath();
		ctx.fill();
	}

	private drawStar(
		ctx: CanvasRenderingContext2D,
		p: Particle,
		s: number,
		dpr: number,
		k: number,
	): void {
		// Twinkle: swells in and out over its life.
		const tw = Math.sin(Math.PI * k);
		const len = s * (1.2 + 2.4 * tw);
		const c = Math.cos(p.rot) * dpr;
		const sn = Math.sin(p.rot) * dpr;
		ctx.setTransform(c, sn, -sn, c, p.x * dpr, p.y * dpr);
		ctx.strokeStyle = p.color;
		ctx.lineCap = "round";
		ctx.lineWidth = Math.max(0.6, s * 0.32);
		ctx.beginPath();
		ctx.moveTo(-len, 0);
		ctx.lineTo(len, 0);
		ctx.moveTo(0, -len);
		ctx.lineTo(0, len);
		ctx.stroke();
		const spr = p.sprite;
		if (spr) {
			const r = s * 1.6;
			ctx.drawImage(spr, -r, -r, r * 2, r * 2);
		}
	}
}

let shared: Engine | null = null;

/** The one engine (created on first use in the browser). */
export function engine(): Engine | null {
	if (typeof window === "undefined") return null;
	shared ??= new Engine();
	return shared;
}
