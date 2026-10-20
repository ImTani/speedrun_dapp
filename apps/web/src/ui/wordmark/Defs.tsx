/**
 * The wordmark's shared SVG definitions: one block per page (the first <Wordmark> brings it,
 * or put <WordmarkDefs /> once and pass `defs={false}`). Every filter works in the lettering's
 * own user units (the name's em is ~100), so a radius is a fixed fraction of the letter and
 * the relief reads the same at 28 px and at 300 px.
 *
 *   wm-f-gilt    gilt relief: distressed edge, bevel (diffuse + specular), feMorphology ink
 *                edge, cast shadow, warm ember glow
 *   wm-f-leaf    gold leaf on vellum: uneven tone, burnish, bole showing through, inked
 *                outline with a red pen line (the hybrid's initial)
 *   wm-f-illum   the B family's leaf: the same uneven leaf and burnish, a thin umber keyline (a
 *                gilder's line, no red anywhere), a soft ink shadow and a warm ember glow behind
 *   wm-f-carve   V-cut into brass: recessed lighting, inner shadow, highlight lip
 *   wm-f-rubric  small lettering: ink cast and a faint glow in its own colour
 *   wm-f-drop    a soft ink drop (ornaments, the initial's panel)
 *
 * Kept out of layout but never display:none (some engines drop gradients defined there).
 */
import s from "./wordmark.module.css";

export const WM = {
	gilt: "url(#wm-g-gilt)",
	leaf: "url(#wm-g-leaf)",
	illum: "url(#wm-g-illum)",
	brass: "url(#wm-g-brass)",
	field: "url(#wm-g-field)",
	diaper: "url(#wm-p-diaper)",
	ruleL: "url(#wm-g-rule-l)",
	ruleR: "url(#wm-g-rule-r)",
	ruleGiltL: "url(#wm-g-rule-gl)",
	ruleGiltR: "url(#wm-g-rule-gr)",
	ruleRedL: "url(#wm-g-rule-ml)",
	ruleRedR: "url(#wm-g-rule-mr)",
	fGilt: "url(#wm-f-gilt)",
	fLeaf: "url(#wm-f-leaf)",
	fIllum: "url(#wm-f-illum)",
	fCarve: "url(#wm-f-carve)",
	fRubric: "url(#wm-f-rubric)",
	fDrop: "url(#wm-f-drop)",
} as const;

export const INK = "#0b0807";
export const RUBRIC = "#e8574d";
export const BLOOD = "#c7262c";
/** The gilder's keyline round the B family's leaf: near-black umber. */
export const KEYLINE = "#1a0f08";
/** The B family's rubric, quiet: a dull gilt (default) or a muted red (B_RUBRIC). */
export const RUBRIC_GILT = "#c9ad72";
export const RUBRIC_MUTED = "#a9473d";
const RULE_GILT = "#b8975a";
const RULE_MUTED = "#8a3129";

export function WordmarkDefs() {
	return (
		<svg className={s.defs} aria-hidden="true" focusable="false">
			<defs>
				{/* ------------------------------------------------ paints */}
				<linearGradient id="wm-g-gilt" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#fbf0d2" />
					<stop offset="0.38" stopColor="#ecd08c" />
					<stop offset="0.56" stopColor="#c9a24f" />
					<stop offset="0.74" stopColor="#e3c27c" />
					<stop offset="1" stopColor="#8a6a2c" />
				</linearGradient>
				<linearGradient id="wm-g-leaf" x1="0" y1="0" x2="1" y2="0.6">
					<stop offset="0" stopColor="#f6dc94" />
					<stop offset="0.3" stopColor="#e2bd68" />
					<stop offset="0.55" stopColor="#f3d88f" />
					<stop offset="0.8" stopColor="#c99a45" />
					<stop offset="1" stopColor="#e9c977" />
				</linearGradient>
				{/* the B family's leaf, in user space so the capital and the lowercase share one sweep */}
				<linearGradient
					id="wm-g-illum"
					gradientUnits="userSpaceOnUse"
					x1="0"
					y1="-76"
					x2="390"
					y2="-18"
				>
					<stop offset="0" stopColor="#f6dc94" />
					<stop offset="0.3" stopColor="#e2bd68" />
					<stop offset="0.55" stopColor="#f3d88f" />
					<stop offset="0.8" stopColor="#c99a45" />
					<stop offset="1" stopColor="#e9c977" />
				</linearGradient>
				<linearGradient id="wm-g-brass" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0.12" stopColor="#a8843e" />
					<stop offset="0.5" stopColor="#dcb867" />
					<stop offset="0.86" stopColor="#f7e3a8" />
				</linearGradient>
				<linearGradient id="wm-g-field" x1="0" y1="0" x2="0.4" y2="1">
					<stop offset="0" stopColor="#9a1a1f" />
					<stop offset="1" stopColor="#4a080c" />
				</linearGradient>
				<linearGradient id="wm-g-rule-l" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor={BLOOD} stopOpacity="0" />
					<stop offset="1" stopColor={BLOOD} />
				</linearGradient>
				<linearGradient id="wm-g-rule-r" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor={BLOOD} />
					<stop offset="1" stopColor={BLOOD} stopOpacity="0" />
				</linearGradient>
				<linearGradient id="wm-g-rule-gl" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor={RULE_GILT} stopOpacity="0" />
					<stop offset="1" stopColor={RULE_GILT} />
				</linearGradient>
				<linearGradient id="wm-g-rule-gr" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor={RULE_GILT} />
					<stop offset="1" stopColor={RULE_GILT} stopOpacity="0" />
				</linearGradient>
				<linearGradient id="wm-g-rule-ml" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor={RULE_MUTED} stopOpacity="0" />
					<stop offset="1" stopColor={RULE_MUTED} />
				</linearGradient>
				<linearGradient id="wm-g-rule-mr" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor={RULE_MUTED} />
					<stop offset="1" stopColor={RULE_MUTED} stopOpacity="0" />
				</linearGradient>
				{/* a diaper of gold lozenges on the initial's red field */}
				<pattern
					id="wm-p-diaper"
					patternUnits="userSpaceOnUse"
					width="13"
					height="13"
				>
					<path
						d="M6.5 0.8 12.2 6.5 6.5 12.2 0.8 6.5Z"
						fill="none"
						stroke="#e3c27c"
						strokeOpacity="0.32"
						strokeWidth="0.8"
					/>
					<circle cx="6.5" cy="6.5" r="1.1" fill="#f5dfa0" fillOpacity="0.55" />
				</pattern>

				{/* ------------------------------------------------ gilt relief */}
				<filter
					id="wm-f-gilt"
					x="-14%"
					y="-34%"
					width="128%"
					height="168%"
					colorInterpolationFilters="sRGB"
				>
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.7"
						numOctaves="2"
						seed="3"
						result="grain"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="grain"
						scale="1.5"
						xChannelSelector="R"
						yChannelSelector="B"
						result="src"
					/>
					<feGaussianBlur in="src" stdDeviation="2.1" result="bump" />
					<feDiffuseLighting
						in="bump"
						surfaceScale="4"
						diffuseConstant="1.3"
						lightingColor="#ffffff"
						result="diff"
					>
						<feDistantLight azimuth="235" elevation="52" />
					</feDiffuseLighting>
					<feComposite
						in="src"
						in2="diff"
						operator="arithmetic"
						k1="1"
						result="lit"
					/>
					<feSpecularLighting
						in="bump"
						surfaceScale="4"
						specularConstant="0.95"
						specularExponent="18"
						lightingColor="#fff2cc"
						result="spec"
					>
						<feDistantLight azimuth="235" elevation="38" />
					</feSpecularLighting>
					<feComposite in="spec" in2="src" operator="in" result="specIn" />
					<feComposite
						in="lit"
						in2="specIn"
						operator="arithmetic"
						k2="1"
						k3="0.75"
						result="metal"
					/>
					{/* the dark engraved edge and its cast on the stone */}
					<feMorphology in="src" operator="dilate" radius="5" result="fat" />
					<feFlood floodColor={INK} />
					<feComposite in2="fat" operator="in" result="edge" />
					<feOffset in="edge" dy="4.5" result="cast" />
					<feGaussianBlur in="edge" stdDeviation="6" />
					<feOffset dy="8" result="deep" />
					{/* warm ember glow */}
					<feGaussianBlur in="fat" stdDeviation="13" result="halo" />
					<feFlood floodColor="#ff7a45" floodOpacity="0.34" />
					<feComposite in2="halo" operator="in" result="ember" />
					<feMerge>
						<feMergeNode in="ember" />
						<feMergeNode in="deep" />
						<feMergeNode in="cast" />
						<feMergeNode in="edge" />
						<feMergeNode in="metal" />
					</feMerge>
				</filter>

				{/* ------------------------------------------------ gold leaf */}
				<filter
					id="wm-f-leaf"
					x="-12%"
					y="-30%"
					width="124%"
					height="160%"
					colorInterpolationFilters="sRGB"
				>
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.045"
						numOctaves="3"
						seed="11"
						result="patch"
					/>
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.55"
						numOctaves="2"
						seed="5"
						result="grain"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="grain"
						scale="2"
						xChannelSelector="R"
						yChannelSelector="G"
						result="src"
					/>
					{/* uneven leaf: broad patches of brighter and duller gold */}
					<feColorMatrix
						in="patch"
						type="matrix"
						values="0.95 0 0 0 0.5  0.95 0 0 0 0.46  0.95 0 0 0 0.4  0 0 0 0 1"
						result="tone"
					/>
					<feComposite
						in="src"
						in2="tone"
						operator="arithmetic"
						k1="1"
						result="toned"
					/>
					{/* burnish: a bumpy surface catching one light */}
					<feGaussianBlur in="src" stdDeviation="1.5" result="b" />
					<feComposite
						in="b"
						in2="grain"
						operator="arithmetic"
						k2="1"
						k3="0.2"
						result="hgt"
					/>
					<feSpecularLighting
						in="hgt"
						surfaceScale="3"
						specularConstant="0.85"
						specularExponent="22"
						lightingColor="#fff6e0"
						result="spec"
					>
						<feDistantLight azimuth="225" elevation="40" />
					</feSpecularLighting>
					<feComposite in="spec" in2="src" operator="in" result="specIn" />
					<feComposite
						in="toned"
						in2="specIn"
						operator="arithmetic"
						k2="1"
						k3="0.8"
						result="leaf"
					/>
					{/* where the leaf did not take: the red bole shows through */}
					<feComponentTransfer in="grain" result="holes">
						<feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 0 0 0 0 0.75" />
					</feComponentTransfer>
					<feFlood floodColor="#6a2412" />
					<feComposite in2="holes" operator="in" />
					<feComposite in2="src" operator="in" result="bole" />
					{/* the inked outline, and a red pen line around it */}
					<feMorphology in="src" operator="dilate" radius="2.2" result="d1" />
					<feMorphology in="src" operator="dilate" radius="4" result="d2" />
					<feFlood floodColor="#1a0f0a" />
					<feComposite in2="d1" operator="in" result="ink" />
					<feFlood floodColor="#b3261e" />
					<feComposite in2="d2" operator="in" result="pen" />
					<feFlood floodColor={INK} />
					<feComposite in2="d2" operator="in" />
					<feGaussianBlur stdDeviation="4" />
					<feOffset dy="5" result="shadow" />
					<feMerge>
						<feMergeNode in="shadow" />
						<feMergeNode in="pen" />
						<feMergeNode in="ink" />
						<feMergeNode in="leaf" />
						<feMergeNode in="bole" />
					</feMerge>
				</filter>

				{/* ------------------------------------------------ illuminated (B) */}
				<filter
					id="wm-f-illum"
					x="-14%"
					y="-36%"
					width="128%"
					height="172%"
					colorInterpolationFilters="sRGB"
				>
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.045"
						numOctaves="3"
						seed="11"
						result="patch"
					/>
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.55"
						numOctaves="2"
						seed="5"
						result="grain"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="grain"
						scale="1.6"
						xChannelSelector="R"
						yChannelSelector="G"
						result="src"
					/>
					{/* slightly uneven leaf: broad patches a shade brighter or duller */}
					<feColorMatrix
						in="patch"
						type="matrix"
						values="0.8 0 0 0 0.58  0.8 0 0 0 0.54  0.8 0 0 0 0.48  0 0 0 0 1"
						result="tone"
					/>
					<feComposite
						in="src"
						in2="tone"
						operator="arithmetic"
						k1="1"
						result="toned"
					/>
					{/* a subtle burnish: the leaf's tooth catching one light */}
					<feGaussianBlur in="src" stdDeviation="1.5" result="b" />
					<feComposite
						in="b"
						in2="grain"
						operator="arithmetic"
						k2="1"
						k3="0.18"
						result="hgt"
					/>
					<feSpecularLighting
						in="hgt"
						surfaceScale="3"
						specularConstant="0.7"
						specularExponent="24"
						lightingColor="#fff6e0"
						result="spec"
					>
						<feDistantLight azimuth="225" elevation="40" />
					</feSpecularLighting>
					<feComposite in="spec" in2="src" operator="in" result="specIn" />
					<feComposite
						in="toned"
						in2="specIn"
						operator="arithmetic"
						k2="1"
						k3="0.6"
						result="leaf"
					/>
					{/* a few pin-holes where the leaf did not take, the bole showing */}
					<feComponentTransfer in="grain" result="holes">
						<feFuncA
							type="discrete"
							tableValues="0 0 0 0 0 0 0 0 0 0 0 0 0 0.6"
						/>
					</feComponentTransfer>
					<feFlood floodColor="#6a2412" />
					<feComposite in2="holes" operator="in" />
					<feComposite in2="src" operator="in" result="bole" />
					{/* the gilder's keyline: thin, dark umber */}
					<feMorphology in="src" operator="dilate" radius="1.5" result="d1" />
					<feFlood floodColor={KEYLINE} />
					<feComposite in2="d1" operator="in" result="key" />
					{/* a soft ink shadow under it, for the lit floor */}
					<feMorphology in="src" operator="dilate" radius="2.6" result="d2" />
					<feFlood floodColor={INK} floodOpacity="0.8" />
					<feComposite in2="d2" operator="in" />
					<feGaussianBlur stdDeviation="3.2" />
					<feOffset dy="3.5" result="shadow" />
					{/* the warm ember glow behind the letters */}
					<feGaussianBlur in="d2" stdDeviation="11" result="halo" />
					<feFlood floodColor="#ff7a45" floodOpacity="0.36" />
					<feComposite in2="halo" operator="in" result="ember" />
					<feGaussianBlur in="d2" stdDeviation="4" result="core" />
					<feFlood floodColor="#ffae5c" floodOpacity="0.2" />
					<feComposite in2="core" operator="in" result="warm" />
					<feMerge>
						<feMergeNode in="ember" />
						<feMergeNode in="warm" />
						<feMergeNode in="shadow" />
						<feMergeNode in="key" />
						<feMergeNode in="leaf" />
						<feMergeNode in="bole" />
					</feMerge>
				</filter>

				{/* ------------------------------------------------ cut into brass */}
				<filter
					id="wm-f-carve"
					x="-8%"
					y="-30%"
					width="116%"
					height="160%"
					colorInterpolationFilters="sRGB"
				>
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.9"
						numOctaves="1"
						seed="2"
						result="grain"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="grain"
						scale="0.9"
						xChannelSelector="R"
						yChannelSelector="G"
						result="src"
					/>
					<feGaussianBlur in="src" stdDeviation="1.7" result="b" />
					{/* negative relief: the cut's upper wall turns from the light, the lower catches it */}
					<feDiffuseLighting
						in="b"
						surfaceScale="-6"
						diffuseConstant="1.4"
						lightingColor="#ffffff"
						result="diff"
					>
						<feDistantLight azimuth="270" elevation="42" />
					</feDiffuseLighting>
					<feComposite
						in="src"
						in2="diff"
						operator="arithmetic"
						k1="1"
						result="cut"
					/>
					<feSpecularLighting
						in="b"
						surfaceScale="-6"
						specularConstant="0.8"
						specularExponent="20"
						lightingColor="#fff3d0"
						result="spec"
					>
						<feDistantLight azimuth="270" elevation="34" />
					</feSpecularLighting>
					<feComposite in="spec" in2="src" operator="in" result="specIn" />
					<feComposite
						in="cut"
						in2="specIn"
						operator="arithmetic"
						k2="1"
						k3="0.7"
						result="brass"
					/>
					{/* inner shadow under the top edge */}
					<feOffset in="src" dy="3" result="down" />
					<feComposite in="src" in2="down" operator="out" />
					<feGaussianBlur stdDeviation="0.8" result="band" />
					<feFlood floodColor={INK} floodOpacity="0.85" />
					<feComposite in2="band" operator="in" />
					<feComposite in2="src" operator="in" result="inner" />
					{/* the lip below the cut catching the light */}
					<feOffset in="src" dy="1.8" result="low" />
					<feComposite in="low" in2="src" operator="out" result="lipBand" />
					<feFlood floodColor="#fbe7b0" floodOpacity="0.8" />
					<feComposite in2="lipBand" operator="in" result="lip" />
					{/* a ground of shadow around the letters so they read over the lit floor */}
					<feMorphology in="src" operator="dilate" radius="3" />
					<feGaussianBlur stdDeviation="5" result="g" />
					<feFlood floodColor={INK} floodOpacity="0.85" />
					<feComposite in2="g" operator="in" result="ground" />
					<feMerge>
						<feMergeNode in="ground" />
						<feMergeNode in="brass" />
						<feMergeNode in="inner" />
						<feMergeNode in="lip" />
					</feMerge>
				</filter>

				{/* ------------------------------------------------ small lettering */}
				<filter
					id="wm-f-rubric"
					x="-10%"
					y="-60%"
					width="120%"
					height="220%"
					colorInterpolationFilters="sRGB"
				>
					<feMorphology
						in="SourceAlpha"
						operator="dilate"
						radius="0.9"
						result="d"
					/>
					<feFlood floodColor={INK} />
					<feComposite in2="d" operator="in" />
					<feOffset dy="1.6" result="cast" />
					<feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="g" />
					<feColorMatrix
						in="g"
						type="matrix"
						values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.45 0"
						result="glow"
					/>
					<feMerge>
						<feMergeNode in="glow" />
						<feMergeNode in="cast" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
				<filter
					id="wm-f-drop"
					x="-20%"
					y="-20%"
					width="140%"
					height="150%"
					colorInterpolationFilters="sRGB"
				>
					<feDropShadow
						dx="0"
						dy="3"
						stdDeviation="3"
						floodColor="#000"
						floodOpacity="0.85"
					/>
				</filter>
			</defs>
		</svg>
	);
}
