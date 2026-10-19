import { useSyncExternalStore } from "react";
import { fontOf } from "./fonts.ts";
import type {
	CaseMode,
	TuneControl,
	TuneSpec,
	TuneValue,
	TuneValues,
} from "./types.ts";

const CASES: Record<CaseMode, readonly [transform: string, caps: string]> = {
	"as-written": ["none", "normal"],
	"small-caps": ["none", "small-caps"],
	uppercase: ["uppercase", "normal"],
};

export function controlsOf(spec: TuneSpec): Map<string, TuneControl> {
	const m = new Map<string, TuneControl>();
	for (const s of spec.sections)
		for (const it of s.items)
			if (it.kind !== "swatches" && it.kind !== "note") m.set(it.key, it);
	return m;
}

export function defaultsOf(controls: Map<string, TuneControl>): TuneValues {
	const out: TuneValues = {};
	for (const [k, c] of controls) out[k] = c.def;
	return out;
}

/** The CSS variables (without prefix) a control writes for a value. */
function cssOf(c: TuneControl, v: TuneValue): [string, string][] {
	switch (c.kind) {
		case "font":
			return [[c.key, fontOf(String(v))?.stack ?? String(v)]];
		case "range":
			return [[c.key, `${v}${c.unit ?? ""}`]];
		case "color":
			return [c.key, ...(c.also ?? [])].map((k) => [k, String(v)]);
		case "case": {
			const base = c.key.replace(/-case$/, "");
			const [t, caps] = CASES[v as CaseMode] ?? CASES["as-written"];
			return [
				[`${base}-transform`, t],
				[`${base}-caps`, caps],
			];
		}
		default:
			return [[c.key, String(v)]];
	}
}

/** Keep only values a control would accept (stored or pasted values may be stale). */
export function sanitize(
	controls: Map<string, TuneControl>,
	raw: unknown,
): TuneValues {
	const out: TuneValues = {};
	if (!raw || typeof raw !== "object") return out;
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		const c = controls.get(k);
		if (!c) continue;
		switch (c.kind) {
			case "font":
				if (typeof v === "string" && fontOf(v)) out[k] = v;
				break;
			case "weight":
				if (typeof v === "number" && v >= 100 && v <= 900) out[k] = v;
				break;
			case "range":
				if (typeof v === "number" && Number.isFinite(v))
					out[k] = Math.min(c.max, Math.max(c.min, v));
				break;
			case "color":
				if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v))
					out[k] = v.toLowerCase();
				break;
			case "case":
				if (typeof v === "string" && v in CASES) out[k] = v;
				break;
			case "style":
				if (v === "normal" || v === "italic") out[k] = v;
				break;
		}
	}
	return out;
}

/**
 * The live values. Writes straight to the root element's inline style (no React render on the
 * screen), and notifies only the controls bound to the changed key.
 */
export class TuneStore {
	readonly controls: Map<string, TuneControl>;
	readonly defaults: TuneValues;
	values: TuneValues;
	/** Called after a hand edit (not after a preset). */
	onEdit: (() => void) | null = null;
	/** The weight last chosen by hand per weight control: a new face snaps toward it. */
	readonly wants = new Map<string, number>();
	private readonly prefix: string;
	private readonly subs = new Map<string, Set<() => void>>();
	private el: HTMLElement | null = null;

	constructor(spec: TuneSpec, initial: TuneValues) {
		this.prefix = spec.prefix;
		this.controls = controlsOf(spec);
		this.defaults = defaultsOf(this.controls);
		this.values = { ...this.defaults, ...initial };
	}

	attach(el: HTMLElement | null) {
		this.el = el;
		for (const k of this.controls.keys()) this.write(k);
	}

	/** Take every override off the root: the shipped look returns. */
	detach() {
		const el = this.el;
		if (el)
			for (const [k, c] of this.controls)
				for (const [p] of cssOf(c, this.values[k] ?? c.def))
					el.style.removeProperty(this.prefix + p);
		this.el = null;
	}

	get = (k: string): TuneValue => this.values[k] ?? this.defaults[k] ?? "";

	set(k: string, v: TuneValue, edit = true) {
		if (!this.controls.has(k) || this.values[k] === v) return;
		this.values[k] = v;
		this.write(k);
		for (const fn of this.subs.get(k) ?? []) fn();
		if (edit) this.onEdit?.();
	}

	setMany(vals: TuneValues, edit = true) {
		for (const [k, v] of Object.entries(vals)) {
			if (this.controls.get(k)?.kind === "weight") this.wants.set(k, Number(v));
			this.set(k, v, false);
		}
		if (edit) this.onEdit?.();
	}

	/** Values that differ from the shipped look. */
	changed(): TuneValues {
		const out: TuneValues = {};
		for (const [k, v] of Object.entries(this.values))
			if (v !== this.defaults[k]) out[k] = v;
		return out;
	}

	subscribe(k: string, fn: () => void) {
		const set = this.subs.get(k) ?? new Set<() => void>();
		this.subs.set(k, set);
		set.add(fn);
		return () => {
			set.delete(fn);
		};
	}

	private write(k: string) {
		const el = this.el,
			c = this.controls.get(k);
		if (!el || !c) return;
		const v = this.get(k);
		const atDefault = v === c.def;
		for (const [p, val] of cssOf(c, v)) {
			if (atDefault) el.style.removeProperty(this.prefix + p);
			else el.style.setProperty(this.prefix + p, val);
		}
	}
}

/** Re-render on this one key only. */
export function useTuneValue(store: TuneStore, key: string): TuneValue {
	return useSyncExternalStore(
		(fn) => store.subscribe(key, fn),
		() => store.get(key),
		() => store.get(key),
	);
}
