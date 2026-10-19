"use client";

/**
 * Live tuning drawer for subjective looks (type, colour). Shown only when the URL has ?tune.
 *
 *   ?tune          the drawer, collapsed to its bar (or as last left)
 *   ?tune=open     opened
 *   ?tune=<preset> that whole-look preset applied, drawer collapsed (unobstructed)
 *
 * Values are written as CSS variables on the screen's root element (see TuneStore), kept in
 * localStorage, and copied out as compact JSON with "Copy values". The drawer itself is portalled
 * to <body> so no screen transform or overflow clips it.
 */
import {
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { fontOf, fontsFor, loadTuneFonts, snapWeight } from "./fonts.ts";
import { sanitize, TuneStore, useTuneValue } from "./store.ts";
import s from "./tune.module.css";
import type {
	CaseMode,
	TuneControl,
	TuneItem,
	TuneSpec,
	TuneSwatch,
} from "./types.ts";

export interface TunePanelProps {
	spec: TuneSpec;
	/** The screen root that carries the variables. */
	target: RefObject<HTMLElement | null>;
	/** The ?tune value: "", "open", or a preset id. */
	param: string;
	/** Replay the outcome; told which section is open (to pick what to show). */
	onReplay: (section: string) => void;
	/** Hold the outcome on screen. */
	onFreeze: (on: boolean) => void;
}

type Dock = "bottom" | "top";
interface Saved {
	v: 1;
	values: unknown;
	base: string;
	edited: boolean;
	open: boolean;
	dock: Dock;
	section: string;
}
const LOOKS = "looks";

function readSaved(key: string): Partial<Saved> | null {
	try {
		const raw = window.localStorage.getItem(key);
		const v = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
		return v && v.v === 1 ? v : null;
	} catch {
		return null;
	}
}

/** Copy without the async Clipboard API (absent on plain http, e.g. a phone on the LAN). */
function legacyCopy(text: string): boolean {
	const ta = document.createElement("textarea");
	ta.value = text;
	ta.setAttribute("readonly", "");
	ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
	document.body.appendChild(ta);
	ta.focus();
	ta.select();
	ta.setSelectionRange(0, text.length);
	let ok = false;
	try {
		ok = document.execCommand("copy");
	} catch {
		ok = false;
	}
	ta.remove();
	return ok;
}

export function TunePanel({
	spec,
	target,
	param,
	onReplay,
	onFreeze,
}: TunePanelProps) {
	const presetOf = useCallback(
		(id: string | undefined) => spec.presets.find((p) => p.id === id),
		[spec],
	);
	const shipped = spec.presets[0]?.id ?? "current";

	// ---------- initial state: URL preset > saved > shipped look
	const [init] = useState(() => {
		const saved = readSaved(spec.storageKey);
		const fromUrl = presetOf(param);
		const store = new TuneStore(spec, {});
		const values = fromUrl
			? { ...store.defaults, ...fromUrl.values }
			: sanitize(store.controls, saved?.values);
		store.setMany(values, false);
		return {
			store,
			base: fromUrl?.id ?? presetOf(saved?.base)?.id ?? shipped,
			edited: fromUrl ? false : !!saved?.edited,
			open: param === "open" || (!fromUrl && !!saved?.open),
			dock: (saved?.dock === "top" ? "top" : "bottom") as Dock,
			section:
				saved?.section &&
				(saved.section === LOOKS ||
					spec.sections.some((x) => x.id === saved.section))
					? saved.section
					: LOOKS,
		};
	});
	const store = init.store;
	const [open, setOpen] = useState(init.open);
	const [dock, setDock] = useState<Dock>(init.dock);
	const [section, setSection] = useState(init.section);
	const [base, setBase] = useState(init.base);
	const [edited, setEdited] = useState(init.edited);
	const [frozen, setFrozen] = useState(false);
	const [toast, setToast] = useState<string | null>(null);
	const [copyText, setCopyText] = useState<string | null>(null);
	const [resetArmed, setResetArmed] = useState(false);

	// ---------- persistence (debounced; values change at slider rate)
	const ui = useRef({ base, edited, open, dock, section });
	ui.current = { base, edited, open, dock, section };
	const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const save = useCallback(() => {
		clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => {
			const data: Saved = { v: 1, values: store.changed(), ...ui.current };
			try {
				window.localStorage.setItem(spec.storageKey, JSON.stringify(data));
			} catch {
				// private mode / quota: the values still live for this visit
			}
		}, 250);
	}, [store, spec.storageKey]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: save whenever the drawer state moves
	useEffect(save, [save, base, edited, open, dock, section]);

	useEffect(() => {
		store.onEdit = () => {
			setEdited(true);
			save();
		};
		return () => {
			store.onEdit = null;
		};
	}, [store, save]);

	// ---------- attach to the screen root; load the candidate faces
	useEffect(() => {
		loadTuneFonts();
		store.attach(target.current);
		return () => store.detach();
	}, [store, target]);

	// Leave the screen running when the drawer goes away.
	const freezeRef = useRef(onFreeze);
	freezeRef.current = onFreeze;
	useEffect(() => () => freezeRef.current(false), []);

	// ---------- actions
	const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const say = useCallback((msg: string) => {
		setToast(msg);
		clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToast(null), 2400);
	}, []);

	const applyPreset = useCallback(
		(id: string) => {
			const p = presetOf(id);
			if (!p) return;
			store.setMany({ ...store.defaults, ...p.values }, false);
			setBase(p.id);
			setEdited(false);
			say(`Look: ${p.name}`);
		},
		[presetOf, store, say],
	);

	const copy = useCallback(async () => {
		const text = JSON.stringify({
			tune: spec.name,
			base,
			edited,
			values: store.values,
		});
		let ok = false;
		try {
			if (window.isSecureContext && navigator.clipboard) {
				await navigator.clipboard.writeText(text);
				ok = true;
			}
		} catch {
			ok = false;
		}
		if (!ok) ok = legacyCopy(text);
		const n = Object.keys(store.changed()).length;
		if (ok) {
			setCopyText(null);
			say(`Copied: ${n} value${n === 1 ? "" : "s"} changed from shipped`);
		} else {
			setCopyText(text);
			setOpen(true);
			say("Copy blocked here: select the text in the drawer");
		}
	}, [spec.name, base, edited, store, say]);

	useEffect(() => {
		if (!resetArmed) return;
		const t = setTimeout(() => setResetArmed(false), 2600);
		return () => clearTimeout(t);
	}, [resetArmed]);
	const reset = () => {
		if (!resetArmed) {
			setResetArmed(true);
			return;
		}
		setResetArmed(false);
		applyPreset(shipped);
	};

	const toggleFreeze = () => {
		const on = !frozen;
		setFrozen(on);
		onFreeze(on);
	};

	const baseName = presetOf(base)?.name ?? base;
	const sec = spec.sections.find((x) => x.id === section);

	if (typeof document === "undefined") return null;
	return createPortal(
		<aside
			className={s.panel}
			data-dock={dock}
			data-open={open ? "true" : "false"}
			aria-label="Type tuning"
		>
			<div className={s.bar}>
				<button
					type="button"
					className={s.barBtn}
					data-kind="handle"
					onClick={() => setOpen((o) => !o)}
					aria-expanded={open}
				>
					{open ? "Hide" : "Tune"}
				</button>
				<button
					type="button"
					className={s.barBtn}
					onClick={() => onReplay(section)}
				>
					Replay verdict
				</button>
				<button
					type="button"
					className={s.barBtn}
					aria-pressed={frozen}
					onClick={toggleFreeze}
				>
					{frozen ? "Frozen" : "Freeze"}
				</button>
				<button
					type="button"
					className={s.barBtn}
					data-kind="copy"
					onClick={() => void copy()}
				>
					Copy values
				</button>
				{toast && (
					<p className={s.toast} role="status">
						{toast}
					</p>
				)}
			</div>

			{open && (
				<>
					<div className={s.meta}>
						<span className={s.metaLook}>
							{baseName}
							{edited ? <em> (edited)</em> : null}
						</span>
						<button
							type="button"
							className={s.metaBtn}
							data-armed={resetArmed ? "true" : "false"}
							onClick={reset}
						>
							{resetArmed ? "Tap again to reset" : "Reset"}
						</button>
						<button
							type="button"
							className={s.metaBtn}
							onClick={() =>
								setDock((d) => (d === "bottom" ? "top" : "bottom"))
							}
						>
							{dock === "bottom" ? "Move to top" : "Move to bottom"}
						</button>
					</div>
					<nav className={s.tabs} aria-label="Sections">
						{[{ id: LOOKS, label: "Looks" }, ...spec.sections].map((x) => (
							<button
								key={x.id}
								type="button"
								className={s.tab}
								aria-pressed={x.id === section}
								onClick={() => setSection(x.id)}
							>
								{x.label}
							</button>
						))}
					</nav>
					<div className={s.body}>
						{copyText && (
							<div className={s.field}>
								<div className={s.label}>
									<span>Copy blocked: select all and copy</span>
									<button
										type="button"
										className={s.reset}
										onClick={() => setCopyText(null)}
									>
										done
									</button>
								</div>
								<textarea
									className={s.copyBox}
									readOnly
									value={copyText}
									onFocus={(e) => e.currentTarget.select()}
								/>
							</div>
						)}
						{section === LOOKS ? (
							<div className={s.presets}>
								{spec.presets.map((p) => (
									<button
										key={p.id}
										type="button"
										className={s.preset}
										aria-pressed={p.id === base && !edited}
										onClick={() => applyPreset(p.id)}
									>
										<strong>{p.name}</strong>
										<span>{p.note}</span>
									</button>
								))}
							</div>
						) : sec ? (
							sec.items.map((it, i) => (
								<Item
									// biome-ignore lint/suspicious/noArrayIndexKey: items are fixed per section
									key={`${sec.id}${i}`}
									item={it}
									store={store}
								/>
							))
						) : null}
					</div>
				</>
			)}
		</aside>,
		document.body,
	);
}

// ---------------------------------------------------------------- controls

function Item({ item, store }: { item: TuneItem; store: TuneStore }) {
	switch (item.kind) {
		case "font":
			return <FontPick c={item} store={store} />;
		case "weight":
			return <WeightPick c={item} store={store} />;
		case "range":
			return <RangePick c={item} store={store} />;
		case "color":
			return <ColorPick c={item} store={store} />;
		case "case":
			return (
				<Segments
					c={item}
					store={store}
					options={[
						["as-written", "As written"],
						["small-caps", "Small caps"],
						["uppercase", "Uppercase"],
					]}
				/>
			);
		case "style":
			return (
				<Segments
					c={item}
					store={store}
					options={[
						["normal", "Roman"],
						["italic", "Italic"],
					]}
				/>
			);
		case "swatches":
			return <Swatches label={item.label} items={item.items} store={store} />;
		case "note":
			return <p className={s.note}>{item.text}</p>;
	}
}

type Of<K extends TuneControl["kind"]> = Extract<TuneControl, { kind: K }>;

function Head({
	label,
	value,
	onReset,
}: {
	label: string;
	value?: string;
	onReset?: (() => void) | null;
}) {
	return (
		<div className={s.label}>
			<span>{label}</span>
			{value != null && <output className={s.val}>{value}</output>}
			{onReset && (
				<button type="button" className={s.reset} onClick={onReset}>
					reset
				</button>
			)}
		</div>
	);
}

function FontPick({ c, store }: { c: Of<"font">; store: TuneStore }) {
	const v = String(useTuneValue(store, c.key));
	const fonts = useMemo(() => fontsFor(c.prefer), [c.prefer]);
	const row = useRef<HTMLDivElement>(null);

	// Bring the chosen face into view when the section opens.
	useEffect(() => {
		const r = row.current;
		const on = r?.querySelector<HTMLElement>('[aria-pressed="true"]');
		if (r && on)
			r.scrollLeft = on.offsetLeft - r.clientWidth / 2 + on.offsetWidth / 2;
	}, []);

	const pick = (family: string) => {
		store.set(c.key, family);
		if (c.weightKey) {
			const want =
				store.wants.get(c.weightKey) ?? Number(store.get(c.weightKey));
			store.set(c.weightKey, snapWeight(family, want), false);
		}
	};
	return (
		<div className={s.field}>
			<Head
				label={c.label}
				value={v}
				onReset={v !== c.def ? () => pick(c.def) : null}
			/>
			<div ref={row} className={s.chips}>
				{fonts.map((f) => (
					<button
						key={f.family}
						type="button"
						className={s.fontChip}
						aria-pressed={f.family === v}
						aria-label={f.family}
						style={{ fontFamily: f.stack }}
						onClick={() => pick(f.family)}
					>
						{f.family}
					</button>
				))}
			</div>
		</div>
	);
}

function WeightPick({ c, store }: { c: Of<"weight">; store: TuneStore }) {
	const v = Number(useTuneValue(store, c.key));
	const family = String(useTuneValue(store, c.fontKey));
	const ws = fontOf(family)?.weights ?? [400];
	if (ws.length < 2)
		return (
			<div className={s.field}>
				<Head label={c.label} value={`${ws[0] ?? 400} (only weight)`} />
			</div>
		);
	return (
		<div className={s.field}>
			<Head label={c.label} />
			<div className={s.chips}>
				{ws.map((w) => (
					<button
						key={w}
						type="button"
						className={s.chip}
						aria-pressed={w === v}
						onClick={() => {
							store.wants.set(c.key, w);
							store.set(c.key, w);
						}}
					>
						{w}
					</button>
				))}
			</div>
		</div>
	);
}

function RangePick({ c, store }: { c: Of<"range">; store: TuneStore }) {
	const v = Number(useTuneValue(store, c.key));
	const digits = c.step >= 1 ? 0 : c.step >= 0.1 ? 1 : c.step >= 0.01 ? 2 : 3;
	return (
		<div className={s.field}>
			<Head
				label={c.label}
				value={`${v.toFixed(digits)}${c.suffix ?? ""}`}
				onReset={v !== c.def ? () => store.set(c.key, c.def) : null}
			/>
			<input
				type="range"
				className={s.range}
				min={c.min}
				max={c.max}
				step={c.step}
				value={v}
				aria-label={c.label}
				onChange={(e) => store.set(c.key, Number(e.currentTarget.value))}
			/>
		</div>
	);
}

function ColorPick({ c, store }: { c: Of<"color">; store: TuneStore }) {
	const v = String(useTuneValue(store, c.key));
	return (
		<div className={s.colorRow}>
			<label className={s.well} style={{ background: v }}>
				<input
					type="color"
					value={v}
					aria-label={c.label}
					onChange={(e) =>
						store.set(c.key, e.currentTarget.value.toLowerCase())
					}
				/>
			</label>
			<span className={s.colorName}>{c.label}</span>
			<code className={s.hex}>{v}</code>
			{v !== c.def && (
				<button
					type="button"
					className={s.reset}
					onClick={() => store.set(c.key, c.def)}
				>
					reset
				</button>
			)}
		</div>
	);
}

function Segments({
	c,
	store,
	options,
}: {
	c: Of<"case"> | Of<"style">;
	store: TuneStore;
	options: readonly (readonly [CaseMode | string, string])[];
}) {
	const v = String(useTuneValue(store, c.key));
	return (
		<div className={s.field}>
			<Head label={c.label} />
			<div className={s.segments}>
				{options.map(([id, label]) => (
					<button
						key={id}
						type="button"
						className={s.chip}
						aria-pressed={id === v}
						onClick={() => store.set(c.key, id)}
					>
						{label}
					</button>
				))}
			</div>
		</div>
	);
}

function Swatches({
	label,
	items,
	store,
}: {
	label: string;
	items: readonly TuneSwatch[];
	store: TuneStore;
}) {
	return (
		<div className={s.field}>
			<Head label={label} />
			<div className={s.swatches}>
				{items.map((it) => (
					<button
						key={it.name}
						type="button"
						className={s.swatch}
						onClick={() => store.setMany(it.values)}
					>
						<span
							className={s.swatchInk}
							style={{
								background:
									it.chips.length > 1
										? `linear-gradient(180deg, ${it.chips.join(", ")})`
										: it.chips[0],
							}}
						/>
						<span>{it.name}</span>
					</button>
				))}
			</div>
		</div>
	);
}
