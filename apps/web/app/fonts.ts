/**
 * The three faces of the cathedral, self-hosted through next/font (all SIL OFL 1.1,
 * served from our own origin: no Google request at runtime, no unstyled first paint).
 *
 *  - Grenze Gotisch  (display): blackletter with Roman bones, so it stays legible when
 *    slammed large on a phone. Outcome lettering, names, titles. Variable 100-900.
 *  - IM Fell English (book): the Fell types (cut c.1670s, revived by Igino Marini);
 *    letterpress grit that matches the ink drawing. Body, epithets, subtext. 400 + italic.
 *  - Cinzel (numerals and rubrics): engraved Roman capitals with lining figures.
 *    Light counts, small-caps labels. Variable 400-900.
 *
 * Each exposes a private --ff-* variable; globals.css builds the public
 * --font-display / --font-book / --font-num stacks from them.
 */
import { Cinzel, Grenze_Gotisch, IM_Fell_English } from "next/font/google";

export const fontDisplay = Grenze_Gotisch({
	subsets: ["latin"],
	display: "swap",
	variable: "--ff-display",
	fallback: ["Georgia", "serif"],
});

export const fontBook = IM_Fell_English({
	subsets: ["latin"],
	weight: "400",
	style: ["normal", "italic"],
	display: "swap",
	variable: "--ff-book",
	fallback: ["Georgia", "serif"],
});

export const fontNum = Cinzel({
	subsets: ["latin"],
	display: "swap",
	variable: "--ff-num",
	fallback: ["Georgia", "serif"],
});

/** Put on <html>: defines the --ff-* variables for the whole tree. */
export const fontVars = [
	fontDisplay.variable,
	fontBook.variable,
	fontNum.variable,
].join(" ");
