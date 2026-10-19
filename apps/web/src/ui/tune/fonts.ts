/**
 * Candidate faces for live type tuning. The three stock faces are self-hosted by app/fonts.ts and
 * referenced through their --font-* stacks; every other face comes from Google Fonts, and is only
 * requested when the tuning panel mounts (?tune in the URL). Nothing here loads for players.
 *
 * `family` doubles as the id written into copied values.
 */
export type FontKind = "blackletter" | "display" | "capitals" | "book";

export interface TuneFont {
	family: string;
	/** CSS font-family value. */
	stack: string;
	/** Weights that really exist (the panel snaps to these; the screen never fakes a bold). */
	weights: readonly number[];
	italic: boolean;
	kind: FontKind;
	/** Google Fonts css2 `family=` value; absent for the self-hosted stock faces. */
	google?: string;
}

const ALL = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

const gf = (
	family: string,
	kind: FontKind,
	weights: readonly number[],
	italic: boolean,
	axes?: string,
): TuneFont => ({
	family,
	stack: `"${family}", Georgia, serif`,
	weights,
	italic,
	kind,
	google: `${family.replace(/ /g, "+")}${axes ? `:${axes}` : ""}`,
});

export const FONTS: readonly TuneFont[] = [
	// blackletter and gothic display
	{
		family: "Grenze Gotisch",
		stack: "var(--font-display)",
		weights: ALL,
		italic: false,
		kind: "blackletter",
	},
	gf("UnifrakturMaguntia", "blackletter", [400], false),
	gf("Pirata One", "blackletter", [400], false),
	gf(
		"Texturina",
		"blackletter",
		[400, 700, 900],
		true,
		"ital,wght@0,400;0,700;0,900;1,400",
	),
	gf("New Rocker", "blackletter", [400], false),
	gf("Uncial Antiqua", "display", [400], false),
	gf("Almendra", "display", [400, 700], true, "ital,wght@0,400;0,700;1,400"),
	gf("Metamorphous", "display", [400], false),
	// engraved capitals
	{
		family: "Cinzel",
		stack: "var(--font-num)",
		weights: [400, 500, 600, 700, 800, 900],
		italic: false,
		kind: "capitals",
	},
	gf(
		"Cinzel Decorative",
		"capitals",
		[400, 700, 900],
		false,
		"wght@400;700;900",
	),
	gf("Marcellus SC", "capitals", [400], false),
	gf("Cormorant SC", "capitals", [400, 600, 700], false, "wght@400;600;700"),
	gf("IM Fell English SC", "capitals", [400], false),
	// book faces
	{
		family: "IM Fell English",
		stack: "var(--font-book)",
		weights: [400],
		italic: true,
		kind: "book",
	},
	gf("IM Fell DW Pica", "book", [400], true, "ital@0;1"),
	gf(
		"Cormorant Garamond",
		"book",
		[400, 600, 700],
		true,
		"ital,wght@0,400;0,600;0,700;1,400;1,600",
	),
	gf(
		"EB Garamond",
		"book",
		[400, 600, 800],
		true,
		"ital,wght@0,400;0,600;0,800;1,400;1,600",
	),
	gf(
		"Spectral",
		"book",
		[400, 600, 800],
		true,
		"ital,wght@0,400;0,600;0,800;1,400;1,600",
	),
];

const BY_FAMILY = new Map(FONTS.map((f) => [f.family, f]));

export function fontOf(family: string): TuneFont | undefined {
	return BY_FAMILY.get(family);
}

/** The real weight of `family` nearest to `want`. */
export function snapWeight(family: string, want: number): number {
	const ws = fontOf(family)?.weights ?? [400];
	let best = ws[0] ?? 400;
	for (const w of ws) if (Math.abs(w - want) < Math.abs(best - want)) best = w;
	return best;
}

/** Faces ordered for a role: the preferred kinds first, catalogue order within. */
export function fontsFor(prefer: readonly FontKind[]): TuneFont[] {
	const rank = (k: FontKind) => {
		const i = prefer.indexOf(k);
		return i < 0 ? prefer.length : i;
	};
	return [...FONTS].sort((a, b) => rank(a.kind) - rank(b.kind));
}

/**
 * Request every Google face, one stylesheet each (so one bad family cannot sink the rest).
 * The stylesheets only declare @font-face; a file downloads when text first uses it.
 */
export function loadTuneFonts() {
	if (typeof document === "undefined") return;
	if (document.head.querySelector("link[data-tune-fonts]")) return;
	const add = (attrs: Record<string, string>) => {
		const l = document.createElement("link");
		for (const [k, v] of Object.entries(attrs)) l.setAttribute(k, v);
		l.setAttribute("data-tune-fonts", "");
		document.head.appendChild(l);
	};
	add({ rel: "preconnect", href: "https://fonts.googleapis.com" });
	add({
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossorigin: "",
	});
	for (const f of FONTS)
		if (f.google)
			add({
				rel: "stylesheet",
				href: `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`,
			});
}
