/**
 * The faces of the cathedral, self-hosted through next/font (all SIL OFL 1.1,
 * served from our own origin: no Google request at runtime, no unstyled first paint).
 *
 *  - Grenze Gotisch  (display): blackletter with Roman bones, so it stays legible when
 *    slammed large on a phone. Outcome lettering, names, titles. Variable 100-900.
 *  - IM Fell English (book): the Fell types (cut c.1670s, revived by Igino Marini);
 *    letterpress grit that matches the ink drawing. Body, epithets, subtext. 400 + italic.
 *  - Cinzel (numerals and rubrics): engraved Roman capitals with lining figures.
 *    Light counts, small-caps labels. Variable 400-900.
 *  - Grenze (roman): the roman sibling of Grenze Gotisch, same bones and spurs without the
 *    blackletter; condensed, x-height 0.47, so long names fit and read at 16px. The Gathering's
 *    verdict, header and name plates. Variable 100-900.
 *  - Alegreya (text): a calligraphic book face with open counters and a 0.46 x-height; reads
 *    at 13-18px over the busy floor. The Gathering's subline, feed and hints. Variable 400-900
 *    + italic.
 *  - UnifrakturMaguntia (fraktur): a classic Fraktur with broad, inkable strokes, for the wordmark's
 *    illuminated variants only (src/ui/wordmark: "postasy"). Not preloaded: it is fetched only
 *    when one of those variants puts it on screen.
 *  - UnifrakturCook (fraktur initial): a Schwabacher-boned Fraktur whose capital A has a closed
 *    apex and a crossbar; the wordmark's B3 initial only. Not preloaded, one weight (700).
 *
 * Each exposes a private --ff-* variable; globals.css builds the public
 * --font-display / --font-book / --font-num stacks from them.
 */
import {
	Alegreya,
	Cinzel,
	Grenze,
	Grenze_Gotisch,
	IM_Fell_English,
	UnifrakturCook,
	UnifrakturMaguntia,
} from "next/font/google";

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

export const fontRoman = Grenze({
	subsets: ["latin"],
	display: "swap",
	variable: "--ff-roman",
	fallback: ["Georgia", "serif"],
});

export const fontText = Alegreya({
	subsets: ["latin"],
	style: ["normal", "italic"],
	display: "swap",
	variable: "--ff-text",
	fallback: ["Georgia", "serif"],
});

export const fontFraktur = UnifrakturMaguntia({
	subsets: ["latin"],
	weight: "400",
	display: "swap",
	preload: true, // the shipped wordmark (B3) sets "postasy" in Maguntia
	variable: "--ff-fraktur",
	fallback: ["Georgia", "serif"],
});

export const fontFrakturCap = UnifrakturCook({
	subsets: ["latin"],
	weight: "700",
	display: "swap",
	preload: true, // the shipped wordmark's capital A
	variable: "--ff-fraktur-cap",
	fallback: ["Georgia", "serif"],
});

/** Put on <html>: defines the --ff-* variables for the whole tree. */
export const fontVars = [
	fontDisplay.variable,
	fontBook.variable,
	fontNum.variable,
	fontRoman.variable,
	fontText.variable,
	fontFraktur.variable,
	fontFrakturCap.variable,
].join(" ");
