"use client";

/**
 * The name, struck: inline SVG lettering with SVG-filter relief (see Defs.tsx), laid out to
 * the glyph from metrics.ts so the server and the client agree and nothing shifts.
 *
 *   <Wordmark />                                   variant from config (or ?wordmark=)
 *   <Wordmark variant="engraved" layout="horizontal" size={40} />
 *   <Wordmark part="name" sheen />  <Wordmark part="sub" defs={false} />   (title: two beats)
 *
 * `size` is px per name-em (the old cap-size); leave it out and the mark takes its em from
 * the surrounding font-size, so CSS clamp() sizes it. It never grows past its container.
 */
import { useReducedMotion } from "motion/react";
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";
import {
	B_RUBRIC,
	isIlluminated,
	parseWordmarkVariant,
	WORDMARK_NAME,
	WORDMARK_SUB,
	WORDMARK_VARIANT,
	type WordmarkLayout,
	type WordmarkVariant,
} from "./config";
import {
	INK,
	RUBRIC,
	RUBRIC_GILT,
	RUBRIC_MUTED,
	WM,
	WordmarkDefs,
} from "./Defs";
import { DRAWN_A } from "./glyphs";
import {
	layoutMark,
	type MarkLayout,
	type Panel,
	partBox,
	type Rule,
	type Run,
	type WordmarkPart,
} from "./layout";
import s from "./wordmark.module.css";

const FONT: Record<Run["face"], CSSProperties> = {
	gothic: { fontFamily: "var(--font-display)", fontWeight: 900 },
	fraktur: {
		fontFamily: 'var(--ff-fraktur, "UnifrakturMaguntia"), var(--font-display)',
		fontWeight: 400,
	},
	caps: { fontFamily: "var(--font-num)", fontWeight: 900 },
	rubric: { fontFamily: "var(--font-num)", fontWeight: 700 },
	gothic6: { fontFamily: "var(--font-display)", fontWeight: 600 },
	cook: {
		fontFamily:
			'var(--ff-fraktur-cap, "UnifrakturCook"), var(--ff-fraktur, "UnifrakturMaguntia"), var(--font-display)',
		fontWeight: 700,
	},
	// a path, not a face (glyphs.ts)
	drawn: {},
};

const noSub = () => () => {};
const fromUrl = () =>
	parseWordmarkVariant(
		new URLSearchParams(window.location.search).get("wordmark"),
	) ?? WORDMARK_VARIANT;
const fromConfig = () => WORDMARK_VARIANT;
const onClient = () => true;
const onServer = () => false;

/** The configured variant, or the page's `?wordmark=` override (read after hydration). */
export function useWordmarkVariant(): WordmarkVariant {
	return useSyncExternalStore(noSub, fromUrl, fromConfig);
}

export type WordmarkProps = {
	variant?: WordmarkVariant;
	layout?: WordmarkLayout;
	/** px per name-em; omit to inherit font-size. */
	size?: number;
	part?: WordmarkPart;
	/** Bring the shared <defs> (default). Pass false when another mark on the page has them. */
	defs?: boolean;
	/** A slow light along the name (skipped under reduced motion). */
	sheen?: boolean;
	className?: string;
	style?: CSSProperties;
};

export function Wordmark({
	variant,
	layout = "stacked",
	size,
	part = "all",
	defs = true,
	sheen = false,
	className,
	style,
}: WordmarkProps) {
	const urlVariant = useWordmarkVariant();
	const v = variant ?? urlVariant;
	const m = useMemo(() => layoutMark(v, layout), [v, layout]);
	const [x, y, w, h] = partBox(m, part);
	const reduce = useReducedMotion() ?? false;
	// The light is client-only (after hydration), so reduced motion can never mismatch the server.
	const client = useSyncExternalStore(noSub, onClient, onServer);
	const shine = sheen && client && !reduce && part !== "sub";
	const vb = `${x} ${y} ${w} ${h}`;
	const em = (n: number) => `${(n / 100).toFixed(3)}em`;
	const label =
		part === "name"
			? WORDMARK_NAME
			: part === "sub"
				? WORDMARK_SUB
				: `${WORDMARK_NAME}: ${WORDMARK_SUB}`;
	return (
		<span
			className={[s.root, className].filter(Boolean).join(" ")}
			data-variant={v}
			data-sheen={shine || undefined}
			style={{ ...(size ? { fontSize: size } : null), ...style }}
		>
			{defs ? <WordmarkDefs /> : null}
			<svg
				className={s.art}
				viewBox={vb}
				width={em(w)}
				height={em(h)}
				aria-hidden="true"
				focusable="false"
			>
				{part !== "sub" ? <NameArt m={m} /> : null}
				{part !== "name" ? <SubArt m={m} /> : null}
			</svg>
			{shine ? <Sheen m={m} vb={vb} /> : null}
			<span className="sr-only">{label}</span>
		</span>
	);
}

// ---------------------------------------------------------------- pieces

function Glyphs({
	r,
	fill,
	filter,
	style,
}: {
	r: Run;
	fill: string;
	filter?: string;
	style?: CSSProperties;
}) {
	if (r.face === "drawn") {
		// Drawn letters are paths in a 1000-unit em, y down from the baseline.
		return (
			<path
				d={DRAWN_A.d}
				transform={`translate(${r.xs[0] ?? 0} ${r.y}) scale(${r.size / 1000})`}
				fill={fill}
				filter={filter}
				style={style}
			/>
		);
	}
	return (
		<text
			x={r.xs.join(" ")}
			y={r.y}
			fontSize={r.size}
			fill={fill}
			filter={filter}
			className={s.text}
			style={{ ...FONT[r.face], ...style }}
		>
			{r.text}
		</text>
	);
}

function NameArt({ m }: { m: MarkLayout }) {
	if (isIlluminated(m.variant)) {
		// One filter over the capital and the lowercase: one keyline, one glow, one sweep of leaf.
		return (
			<g filter={WM.fIllum}>
				{m.name.map((r) => (
					<Glyphs key={r.text} r={r} fill={WM.illum} />
				))}
			</g>
		);
	}
	switch (m.variant) {
		case "engraved":
			return (
				<>
					{m.name.map((r) => (
						<Glyphs key={r.text} r={r} fill={WM.brass} filter={WM.fCarve} />
					))}
				</>
			);
		case "hybrid": {
			const [cap, rest] = m.name;
			return (
				<>
					{m.panel ? <InitialPanel p={m.panel} /> : null}
					{cap ? <Glyphs r={cap} fill={WM.leaf} filter={WM.fLeaf} /> : null}
					{rest ? <Glyphs r={rest} fill={WM.brass} filter={WM.fCarve} /> : null}
				</>
			);
		}
		default:
			return (
				<>
					{m.name.map((r) => (
						<Glyphs key={r.text} r={r} fill={WM.gilt} filter={WM.fGilt} />
					))}
				</>
			);
	}
}

/** The pen rule's colours: [fade in from the left, fade out to the right, the mark]. */
type PenTone = { l: string; r: string; mark: string };
const PEN: Record<"red" | "gilt" | "muted", PenTone> = {
	red: { l: WM.ruleL, r: WM.ruleR, mark: RUBRIC },
	gilt: { l: WM.ruleGiltL, r: WM.ruleGiltR, mark: RUBRIC_GILT },
	muted: { l: WM.ruleRedL, r: WM.ruleRedR, mark: RUBRIC_MUTED },
};

function SubArt({ m }: { m: MarkLayout }) {
	const engraved = m.variant === "engraved";
	const illum = isIlluminated(m.variant);
	const tone = PEN[B_RUBRIC === "red" ? "muted" : "gilt"];
	return (
		<>
			<g filter={WM.fDrop}>
				{m.rules.map((r) => (
					<RuleArt
						key={`${r.x0}`}
						r={r}
						k={m.ruleSize}
						kind={engraved ? "double" : illum ? "pen" : "taper"}
						tone={tone}
					/>
				))}
			</g>
			<Glyphs
				r={m.sub}
				fill={engraved ? WM.brass : illum ? tone.mark : RUBRIC}
				filter={WM.fRubric}
			/>
		</>
	);
}

/** Rules either side of the rubric: a gilt-taper with a lozenge, a pen line, or a double hairline. */
function RuleArt({
	r,
	k,
	kind,
	tone = PEN.red,
}: {
	r: Rule;
	k: number;
	kind: "taper" | "pen" | "double";
	tone?: PenTone;
}) {
	const inX = r.inner === "r" ? r.x1 : r.x0;
	const outX = r.inner === "r" ? r.x0 : r.x1;
	const dir = r.inner === "r" ? 1 : -1;
	const f = (n: number) => n.toFixed(2);
	const lozenge = (cx: number, rad: number) =>
		`M${f(cx)} ${f(r.y - rad)} L${f(cx + rad)} ${f(r.y)} L${f(cx)} ${f(r.y + rad)} L${f(cx - rad)} ${f(r.y)}Z`;
	if (kind === "double") {
		const g = k * 0.7;
		return (
			<g fill="#c9a24f">
				<rect
					x={f(r.x0)}
					y={f(r.y - g - k * 0.25)}
					width={f(r.x1 - r.x0)}
					height={f(k * 0.5)}
				/>
				<rect
					x={f(r.x0)}
					y={f(r.y + g - k * 0.25)}
					width={f(r.x1 - r.x0)}
					height={f(k * 0.5)}
				/>
				<circle cx={f(inX)} cy={f(r.y)} r={f(k * 1.1)} fill="#e3c27c" />
			</g>
		);
	}
	if (kind === "pen") {
		return (
			<g>
				<rect
					x={f(r.x0)}
					y={f(r.y - k * 0.3)}
					width={f(r.x1 - r.x0)}
					height={f(k * 0.6)}
					fill={r.inner === "r" ? tone.l : tone.r}
				/>
				<path
					d={lozenge(inX - dir * k * 1.6, k * 1.6)}
					fill={INK}
					stroke={tone.mark}
					strokeWidth={f(k * 0.55)}
				/>
				<circle
					cx={f(outX + dir * k * 0.6)}
					cy={f(r.y)}
					r={f(k * 0.55)}
					fill={tone.mark}
				/>
			</g>
		);
	}
	// taper: hairline at the outer end swelling to the lozenge
	const t = k * 0.7;
	const d = `M${f(outX)} ${f(r.y)} L${f(inX)} ${f(r.y - t)} L${f(inX)} ${f(r.y + t)}Z`;
	return (
		<g>
			<path d={d} fill={r.inner === "r" ? WM.ruleL : WM.ruleR} />
			<path d={lozenge(inX, k * 2)} fill="#c7262c" />
			<path d={lozenge(inX, k * 0.8)} fill="#f5dfa0" fillOpacity="0.7" />
		</g>
	);
}

/** The hybrid initial's panel: red field, gold lozenge diaper, gilt border, corner lozenges. */
function InitialPanel({ p }: { p: Panel }) {
	const { x, y, s: n } = p;
	const b = n * 0.035;
	const corner = (cx: number, cy: number): ReactNode => (
		<path
			key={`${cx}-${cy}`}
			d={`M${cx} ${cy - b * 3} L${cx + b * 3} ${cy} L${cx} ${cy + b * 3} L${cx - b * 3} ${cy}Z`}
			fill={WM.gilt}
			stroke={INK}
			strokeWidth={b * 0.6}
		/>
	);
	return (
		<g filter={WM.fDrop}>
			<rect x={x} y={y} width={n} height={n} fill={INK} />
			<rect
				x={x + b * 2}
				y={y + b * 2}
				width={n - b * 4}
				height={n - b * 4}
				fill={WM.field}
			/>
			<rect
				x={x + b * 2}
				y={y + b * 2}
				width={n - b * 4}
				height={n - b * 4}
				fill={WM.diaper}
			/>
			<rect
				x={x + b}
				y={y + b}
				width={n - b * 2}
				height={n - b * 2}
				fill="none"
				stroke={WM.gilt}
				strokeWidth={b * 1.2}
			/>
			<rect
				x={x + b * 3.2}
				y={y + b * 3.2}
				width={n - b * 6.4}
				height={n - b * 6.4}
				fill="none"
				stroke="#e3c27c"
				strokeOpacity="0.55"
				strokeWidth={b * 0.4}
			/>
			{corner(x + b, y + b)}
			{corner(x + n - b, y + b)}
			{corner(x + b, y + n - b)}
			{corner(x + n - b, y + n - b)}
		</g>
	);
}

/**
 * The passing light: the name's glyphs again, unfiltered, filled with a moving band, in their
 * own layer over the art so the relief filters are never re-run while it moves. Paused while
 * the page is hidden or the mark is off screen.
 */
function Sheen({ m, vb }: { m: MarkLayout; vb: string }) {
	const ref = useRef<SVGSVGElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		let seen = true;
		const sync = () => {
			if (document.hidden || !seen) el.pauseAnimations();
			else el.unpauseAnimations();
		};
		const io = new IntersectionObserver(([e]) => {
			seen = e?.isIntersecting ?? true;
			sync();
		});
		io.observe(el);
		document.addEventListener("visibilitychange", sync);
		return () => {
			io.disconnect();
			document.removeEventListener("visibilitychange", sync);
		};
	}, []);
	return (
		<svg
			ref={ref}
			className={s.sheen}
			viewBox={vb}
			aria-hidden="true"
			focusable="false"
		>
			<defs>
				<linearGradient
					id="wm-sheen"
					x1="0"
					y1="0"
					x2="1"
					y2="0.22"
					gradientTransform="translate(-0.75 0)"
				>
					<stop offset="0.4" stopColor="#fff6dc" stopOpacity="0" />
					<stop offset="0.48" stopColor="#fff6dc" stopOpacity="0.62" />
					<stop offset="0.52" stopColor="#fff6dc" stopOpacity="0.62" />
					<stop offset="0.6" stopColor="#fff6dc" stopOpacity="0" />
					<animateTransform
						attributeName="gradientTransform"
						type="translate"
						values="-0.75 0; 0.75 0; 0.75 0"
						keyTimes="0; 0.36; 1"
						dur="7.5s"
						begin="2.4s"
						repeatCount="indefinite"
					/>
				</linearGradient>
			</defs>
			{m.name.map((r) => (
				<Glyphs key={r.text} r={r} fill="url(#wm-sheen)" />
			))}
		</svg>
	);
}
