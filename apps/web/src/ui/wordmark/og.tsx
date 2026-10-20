/**
 * The wordmark for the share card (next/og ImageResponse). Satori draws no SVG filters on HTML, so
 * each lettering is flattened to what it can draw: stacked text layers (ink stroke under a
 * gradient fill clipped to the glyphs), text shadows for the lip, the cast and the ember glow,
 * plain boxes for the rules and the initial's panel. Not a client module: no hooks.
 *
 * The B family (b1-b3): the capital and "postasy" share one baseline (a flex row aligned to
 * baseline; b2's drawn A is a small SVG set on Maguntia's baseline), a thin umber keyline and a
 * warm glow. No red on the name.
 */
import {
	B_RUBRIC,
	type IlluminatedVariant,
	isIlluminated,
	WORDMARK_NAME,
	WORDMARK_SUB,
	type WordmarkVariant,
} from "./config";
import { DRAWN_A } from "./glyphs";

/** The faces the card must fetch for a variant: [css2 family, weight, text, name]. */
export function ogWordmarkFonts(variant: WordmarkVariant): {
	family: string;
	weight: 400 | 600 | 700 | 800 | 900;
	text: string;
	name: string;
}[] {
	const sub = {
		family: "Cinzel",
		weight: 700 as const,
		text: WORDMARK_SUB.toUpperCase(),
		name: "Cinzel",
	};
	if (isIlluminated(variant)) {
		const rest = {
			family: "UnifrakturMaguntia",
			weight: 400 as const,
			text: WORDMARK_NAME.slice(1),
			name: "UnifrakturMaguntia",
		};
		const cap = OG_INITIAL[variant].font;
		return cap
			? [{ ...cap, text: WORDMARK_NAME.slice(0, 1) }, rest, sub]
			: [rest, sub];
	}
	switch (variant) {
		case "engraved":
			return [
				{
					family: "Cinzel",
					weight: 900,
					text: WORDMARK_NAME.toUpperCase(),
					name: "Cinzel",
				},
				sub,
			];
		case "hybrid":
			return [
				{
					family: "Grenze+Gotisch",
					weight: 900,
					text: WORDMARK_NAME.slice(0, 1),
					name: "Grenze Gotisch",
				},
				{
					family: "Cinzel",
					weight: 900,
					text: WORDMARK_NAME.slice(1).toLowerCase(),
					name: "Cinzel",
				},
				sub,
			];
		default:
			return [
				{
					family: "Grenze+Gotisch",
					weight: 900,
					text: WORDMARK_NAME,
					name: "Grenze Gotisch",
				},
				sub,
			];
	}
}

/** The B family's capitals on the card (sizes and gaps as INITIAL in layout.ts, in em). */
const OG_INITIAL: Record<
	IlluminatedVariant,
	{
		font?: { family: string; weight: 600 | 700; name: string };
		scale: number;
		gap: number;
	}
> = {
	b1: {
		font: { family: "Grenze+Gotisch", weight: 600, name: "Grenze Gotisch" },
		scale: 1.1,
		gap: 0.01,
	},
	b2: { scale: 1, gap: 0 },
	b3: {
		font: { family: "UnifrakturCook", weight: 700, name: "UnifrakturCook" },
		scale: 1,
		gap: -0.01,
	},
};

/**
 * Where Satori sets UnifrakturMaguntia's baseline in a line box of lineHeight 1, in em: half the
 * leading, (1 - (ascender - descender)) / 2, plus the ascender (hhea 0.7847 and -0.2505).
 */
const MAGUNTIA_BASELINE = 0.767;

const INK = "#0b0807";
const KEYLINE = "#1a0f08";
const GILT =
	"linear-gradient(180deg, #fbf0d2 0%, #ecd08c 38%, #c9a24f 56%, #e3c27c 74%, #8a6a2c 100%)";
const LEAF =
	"linear-gradient(120deg, #f6dc94 0%, #e2bd68 30%, #f3d88f 55%, #c99a45 80%, #e9c977 100%)";
const BRASS = "linear-gradient(180deg, #a8843e 12%, #dcb867 50%, #f7e3a8 86%)";

/** A word drawn as layers: each layer the same text, stacked in one grid cell. */
function Layered({
	text,
	font,
	size,
	weight,
	track = 0,
	layers,
}: {
	text: string;
	font: string;
	size: number;
	weight: number;
	track?: number;
	layers: Record<string, string | number>[];
}) {
	const base = {
		fontFamily: font,
		fontSize: size,
		fontWeight: weight,
		lineHeight: 1,
		letterSpacing: track * size,
		whiteSpace: "nowrap" as const,
	};
	return (
		<div style={{ display: "flex", position: "relative" }}>
			{layers.map((l, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed layer order
					key={i}
					style={{
						...base,
						...l,
						...(i === 0 ? {} : { position: "absolute", left: 0, top: 0 }),
					}}
				>
					{text}
				</div>
			))}
		</div>
	);
}

const fill = (paint: string) => ({
	color: "transparent",
	backgroundImage: paint,
	backgroundClip: "text",
});

/** Gold leaf over a thin umber keyline, a soft cast and a warm ember glow behind. */
const illumLayers = (size: number) => [
	{
		color: KEYLINE,
		WebkitTextStroke: `${size * 0.03}px ${KEYLINE}`,
		textShadow: `0 0 ${size * 0.16}px #ff7a4570, 0 0 ${size * 0.06}px #ffae5c38, 0 ${size * 0.035}px ${size * 0.05}px #000000cc`,
	},
	fill(LEAF),
];

/** b2's drawn capital: its path keylined and leafed in a small SVG, sat on Maguntia's baseline. */
function DrawnInitial({ size }: { size: number }) {
	const [adv, x0, x1, y0, y1] = DRAWN_A.metric;
	const pad = 0.2;
	const vx = (x0 - pad) * 1000;
	const vy = -(y1 + pad) * 1000;
	const vw = (x1 - x0 + 2 * pad) * 1000;
	const vh = (y1 - y0 + 2 * pad) * 1000;
	const k = size / 1000;
	return (
		<div
			style={{
				display: "flex",
				position: "relative",
				width: adv * size,
				height: size,
			}}
		>
			<svg
				aria-hidden="true"
				width={vw * k}
				height={vh * k}
				viewBox={`${vx} ${vy} ${vw} ${vh}`}
				style={{
					position: "absolute",
					left: vx * k,
					top: (MAGUNTIA_BASELINE - y1 - pad) * size,
				}}
			>
				<defs>
					<linearGradient id="og-leaf" x1="0" y1="0" x2="1" y2="0.6">
						<stop offset="0" stopColor="#f6dc94" />
						<stop offset="0.3" stopColor="#e2bd68" />
						<stop offset="0.55" stopColor="#f3d88f" />
						<stop offset="0.8" stopColor="#c99a45" />
						<stop offset="1" stopColor="#e9c977" />
					</linearGradient>
					<filter id="og-glow" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation="70" />
					</filter>
					<filter id="og-cast" x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="25" />
					</filter>
				</defs>
				<path
					d={DRAWN_A.d}
					fill="#ff7a45"
					fillOpacity="0.26"
					stroke="#ff7a45"
					strokeOpacity="0.26"
					strokeWidth="60"
					filter="url(#og-glow)"
				/>
				<path
					d={DRAWN_A.d}
					transform="translate(0 35)"
					fill="#000"
					fillOpacity="0.8"
					filter="url(#og-cast)"
				/>
				<path
					d={DRAWN_A.d}
					fill={KEYLINE}
					stroke={KEYLINE}
					strokeWidth="32"
					strokeLinejoin="round"
				/>
				<path d={DRAWN_A.d} fill="url(#og-leaf)" />
			</svg>
		</div>
	);
}

function IlluminatedName({
	variant,
	size,
}: {
	variant: IlluminatedVariant;
	size: number;
}) {
	const cap = OG_INITIAL[variant];
	const rest = (
		<div style={{ display: "flex", marginLeft: cap.gap * size }}>
			<Layered
				text={WORDMARK_NAME.slice(1)}
				font="UnifrakturMaguntia"
				size={size}
				weight={400}
				layers={illumLayers(size)}
			/>
		</div>
	);
	if (!cap.font) {
		return (
			<div style={{ display: "flex", alignItems: "flex-start" }}>
				<DrawnInitial size={size} />
				{rest}
			</div>
		);
	}
	return (
		<div style={{ display: "flex", alignItems: "baseline" }}>
			<Layered
				text={WORDMARK_NAME.slice(0, 1)}
				font={cap.font.name}
				size={size * cap.scale}
				weight={cap.font.weight}
				layers={illumLayers(size * cap.scale)}
			/>
			{rest}
		</div>
	);
}

function Name({ variant, size }: { variant: WordmarkVariant; size: number }) {
	if (isIlluminated(variant)) {
		return <IlluminatedName variant={variant} size={size} />;
	}
	switch (variant) {
		case "engraved":
			return (
				<Layered
					text={WORDMARK_NAME.toUpperCase()}
					font="Cinzel"
					size={size}
					weight={900}
					track={0.1}
					layers={[
						{
							color: INK,
							textShadow: `0 ${size * 0.03}px 0 #fbe7b0, 0 0 ${size * 0.1}px #000`,
						},
						fill(BRASS),
					]}
				/>
			);
		case "hybrid": {
			const panel = size * 1.12;
			return (
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						gap: size * 0.12,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: panel,
							height: panel,
							backgroundImage: "linear-gradient(170deg, #9a1a1f, #4a080c)",
							border: `${size * 0.04}px solid #c9a24f`,
							boxShadow: `0 0 0 ${size * 0.02}px ${INK}, 0 ${size * 0.04}px ${size * 0.06}px #000`,
						}}
					>
						<Layered
							text={WORDMARK_NAME.slice(0, 1)}
							font="Grenze Gotisch"
							size={size * 1.24}
							weight={900}
							layers={[
								{ color: INK, WebkitTextStroke: `${size * 0.06}px ${INK}` },
								fill(LEAF),
							]}
						/>
					</div>
					<div style={{ display: "flex", marginTop: size * 0.06 }}>
						<Layered
							text={WORDMARK_NAME.slice(1).toLowerCase()}
							font="Cinzel"
							size={size * 0.72}
							weight={900}
							track={0.05}
							layers={[
								{
									color: INK,
									textShadow: `0 ${size * 0.025}px 0 #fbe7b0, 0 0 ${size * 0.08}px #000`,
								},
								fill(BRASS),
							]}
						/>
					</div>
				</div>
			);
		}
		default:
			return (
				<Layered
					text={WORDMARK_NAME}
					font="Grenze Gotisch"
					size={size}
					weight={900}
					layers={[
						{
							color: INK,
							WebkitTextStroke: `${size * 0.1}px ${INK}`,
							textShadow: `0 ${size * 0.05}px 0 ${INK}, 0 0 ${size * 0.14}px #ff7a4540`,
						},
						fill(GILT),
					]}
				/>
			);
	}
}

/** The rubric with its rules, left-aligned (the card sets text in a column). */
function Sub({ variant, size }: { variant: WordmarkVariant; size: number }) {
	const engraved = variant === "engraved";
	// the B family's rubric is quiet: dull gilt, or a muted red (B_RUBRIC)
	const b = isIlluminated(variant)
		? B_RUBRIC === "red"
			? { color: "#a9473d", mark: "#8a3129" }
			: { color: "#c9ad72", mark: "#b8975a" }
		: null;
	const color = engraved ? "#dcb867" : (b?.color ?? "#e8574d");
	const mark = engraved ? "#c9a24f" : (b?.mark ?? "#c7262c");
	// a lozenge and a rule trailing off to the right
	const rule = (
		<div style={{ display: "flex", alignItems: "center" }}>
			<div
				style={{
					width: size * 0.4,
					height: size * 0.4,
					backgroundColor: mark,
					transform: "rotate(45deg)",
				}}
			/>
			<div
				style={{
					width: size * 2.2,
					height: Math.max(2, size * 0.12),
					backgroundImage: `linear-gradient(90deg, ${mark}, transparent)`,
				}}
			/>
		</div>
	);
	return (
		<div style={{ display: "flex", alignItems: "center", gap: size * 0.6 }}>
			<div
				style={{
					fontFamily: "Cinzel",
					fontWeight: 700,
					fontSize: size,
					letterSpacing: size * 0.3,
					color,
					textShadow: `0 ${size * 0.08}px 0 ${INK}`,
				}}
			>
				{WORDMARK_SUB.toUpperCase()}
			</div>
			{rule}
		</div>
	);
}

/** The lockup for the card, about `width` px wide. */
export function OgWordmark({
	variant,
	width,
}: {
	variant: WordmarkVariant;
	width: number;
}) {
	// Name-em per variant so each lettering lands at about the same width.
	const em: Record<WordmarkVariant, number> = {
		gilded: 3.75,
		b1: 3.65,
		b2: 3.65,
		b3: 3.65,
		engraved: 6.5,
		hybrid: 4.6,
	};
	const size = Math.round(width / em[variant]);
	const sub = variant === "engraved" ? size * 0.42 : size * 0.2;
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: size * 0.1 }}>
			<Name variant={variant} size={size} />
			<Sub variant={variant} size={Math.round(Math.max(26, sub))} />
		</div>
	);
}
