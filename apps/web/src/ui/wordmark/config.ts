/**
 * Which lettering the name is struck in, everywhere at once: the title screen, the landing
 * hero, the brand renders (cover, key art) and the share card.
 *
 *   gilded       Grenze Gotisch rebuilt as gilt metal relief (the original look, lit)
 *   b1 b2 b3     illuminated: UnifrakturMaguntia "postasy" in gold leaf, a thin ink keyline and
 *                an ember glow; they differ only in the capital A (Maguntia's own reads as "U"):
 *                  b1  Grenze Gotisch's blackletter A, scaled to the Fraktur
 *                  b2  a Fraktur A drawn for the mark (src/ui/wordmark/glyphs.ts): closed apex
 *                  b3  UnifrakturCook's A
 *   engraved     inscription capitals cut into brass, letterspaced
 *   hybrid       an illuminated initial A in a lozenge panel, then "postasy" engraved
 *
 * Compare the B family side by side at /_brand/wordmarks (dev), or try any in place with
 * `?wordmark=<variant>` (a, b1-b3, c, d; "b" or "illuminated" is B_DEFAULT) on /, /play and /_brand.
 */
export const WORDMARK_VARIANTS = [
	"gilded",
	"b1",
	"b2",
	"b3",
	"engraved",
	"hybrid",
] as const;
export type WordmarkVariant = (typeof WORDMARK_VARIANTS)[number];
export type WordmarkLayout = "stacked" | "horizontal";

/** The illuminated family: one lettering, three capitals. */
export const ILLUMINATED = ["b1", "b2", "b3"] as const;
export type IlluminatedVariant = (typeof ILLUMINATED)[number];
export const isIlluminated = (v: WordmarkVariant): v is IlluminatedVariant =>
	v === "b1" || v === "b2" || v === "b3";

/** What `?wordmark=b` (or `illuminated`) means until the owner picks one. */
export const B_DEFAULT: IlluminatedVariant = "b3";

/** The one switch. Provisional: b1, until the owner picks from the B sheet. */
export const WORDMARK_VARIANT: WordmarkVariant = "b3";

/**
 * The B family's rubric line ("SEDE VACANTE") and its rules: quiet gilt (default) or a muted
 * red. The name itself never carries red.
 */
export const B_RUBRIC: "gilt" | "red" = "gilt";

/** The lockup's words. The glyph tables in metrics.ts cover exactly these letters. */
export const WORDMARK_NAME = "Apostasy";
export const WORDMARK_SUB = "Sede Vacante";

/** Labels, as on the comparison sheet. */
export const WORDMARK_LETTER: Record<WordmarkVariant, string> = {
	gilded: "A",
	b1: "B1",
	b2: "B2",
	b3: "B3",
	engraved: "C",
	hybrid: "D",
};

/** One line on what each is. */
export const WORDMARK_TITLE: Record<WordmarkVariant, string> = {
	gilded: "gilded",
	b1: "illuminated · Grenze Gotisch A",
	b2: "illuminated · drawn Fraktur A",
	b3: "illuminated · UnifrakturCook A",
	engraved: "engraved",
	hybrid: "hybrid",
};

/** "gilded" | "a" | "B2" | "illuminated" ... to a variant; anything else to null. */
export function parseWordmarkVariant(
	v: string | null | undefined,
): WordmarkVariant | null {
	if (!v) return null;
	const s = v.trim().toLowerCase();
	const byName = WORDMARK_VARIANTS.find((x) => x === s);
	if (byName) return byName;
	if (s === "b" || s === "illuminated") return B_DEFAULT;
	if (s === "a") return "gilded";
	if (s === "c") return "engraved";
	if (s === "d") return "hybrid";
	return null;
}
