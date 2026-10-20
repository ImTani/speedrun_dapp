/**
 * Drawn glyphs: letters the faces do not have in the shape the mark needs.
 *
 * DRAWN_A (variant b2) is a Fraktur capital A in UnifrakturMaguntia's hand, but with a closed,
 * pointed apex and a crossbar so it reads as A (Maguntia's own reads as "U"). It was drawn as a
 * broad nib swept along a skeleton, nib held at 38 degrees, 0.12 em wide and 0.022 em thick (so a
 * vertical comes out at Maguntia's 0.10-0.12 em stem and a stroke along the nib at its hairline):
 *
 *   leg     (598 740) (440 650) (236 540) (226 160) then (226 70) (196 18) (132 6): a hairline over
 *           the top of the stem, a "(" full in the belly, a pointed toe out to the left
 *   stem    (546 708) (546 150) (550 -12) (664 36): straight down, out and up into a hairline foot
 *   bar     (230 302) .. (546 346): a rising crossbar at half nib, closed into both legs
 *
 * Units: 1000 per em, y down, baseline at 0, pen at x 0 (place with translate + scale(size/1000)).
 * Every contour winds the same way, so the overlapping strokes fill as one under nonzero.
 */
export const DRAWN_A = {
	d: "M614 -739L601 -756L534 -720L486 -689L388 -613L342 -573L325 -555L302 -530L281 -503L268 -484L243 -442L227 -408L212 -370L199 -329L186 -270L178 -221L174 -169L171 -106L167 -75L162 -54L152 -28L146 -17L137 -8L208 -63L193 -53L180 -46L151 -35L99 6L113 23L130 20L146 13L224 -48L235 -57L247 -70L256 -82L265 -99L273 -121L278 -146L279 -167L283 -243L286 -278L294 -326L307 -386L325 -439L335 -464L352 -499L370 -531L390 -560L411 -587L439 -619L459 -638L485 -661L421 -610L479 -651L527 -682L595 -724ZM587 -754L492 -680L492 -528L494 -364L497 -247L503 -164L511 -100L517 -71L523 -52L529 -37L536 -24L554 0L563 8L575 15L589 18L605 16L623 10L718 -64L705 -82L682 -75L670 -74L663 -74L653 -77L647 -81L635 -91L646 -77L639 -89L633 -103L627 -121L620 -149L615 -182L610 -232L604 -344L601 -489L600 -736ZM200 -292L213 -275L382 -296L529 -319L576 -356L563 -373L416 -351L247 -329Z",
	/** [advance, xMin, xMax, yMin, yMax] in em, y up (as metrics.ts). */
	metric: [0.7, 0.099, 0.718, -0.023, 0.756] as const,
};
