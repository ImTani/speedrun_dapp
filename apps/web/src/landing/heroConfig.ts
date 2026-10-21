/**
 * Which hero the landing page opens on. One constant switches it.
 *
 *   "current" - the lit nave of the title screen beside the words (as shipped)
 *   "a"       - The Nave: a wide nave, three tall lit windows, the name struck in the middle
 *   "b"       - The Face-off: two masked Fragments in their windows, a toll, a verdict, on a loop
 *   "c"       - The Rose: a great turning rose window, the seven masks riding in its panes
 *
 * To compare without a rebuild, "/" takes `?hero=a|b|c` (or `?hero=current`). The sheet with
 * all of them at desktop and phone size: /_brand/hero (dev only).
 */
export const HERO_VARIANTS = ["current", "a", "b", "c"] as const;

export type HeroVariant = (typeof HERO_VARIANTS)[number];

/** The shipped hero. Unchanged until the owner picks. */
export const HERO_VARIANT: HeroVariant = "current";

/** The URL key that overrides HERO_VARIANT. */
export const HERO_PARAM = "hero";

export const isHeroVariant = (v: unknown): v is HeroVariant =>
	typeof v === "string" && (HERO_VARIANTS as readonly string[]).includes(v);

/** Names for the comparison sheet. */
export const HERO_NAMES: Record<HeroVariant, string> = {
	current: "Current",
	a: "A · The Nave",
	b: "B · The Face-off",
	c: "C · The Rose",
};
