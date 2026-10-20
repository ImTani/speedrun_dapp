// Credits for the sounds and the speaker icon, for the Colophon. Every sound source is CC0
// (no credit required; given anyway), the icon is CC BY 3.0 (credit required).
// Full provenance per file: public/ATTRIBUTION.md, section "Sound".

export const SOUND_CREDITS: readonly string[] = [
	"Sounds from Kenney (kenney.nl) and Freesound recordists LadyCailin, JarredGibb, HMTSCCSound, ryancacophony, inoshirodesign, Beetlemuse, Breviceps, bone666138, brachern, qubodup, newagesoup and Quistard, all CC0. Trimmed, layered and mixed.",
	"Speaker icon by Delapouite, game-icons.net, CC BY 3.0 (creativecommons.org/licenses/by/3.0).",
];

/**
 * Speaker glyphs, path data copied unchanged from game-icons.net (Delapouite, CC BY 3.0),
 * github.com/game-icons/icons @ 82d948812bfe3f269ef8f731dcdb07b08160edc4:
 * delapouite/speaker.svg and delapouite/speaker-off.svg. 512 x 512 box.
 */
export const SPEAKER_ICON = {
	on: {
		d: "M275.5 96l-96 96h-96v128h96l96 96V96zm51.46 27.668l-4.66 17.387c52.066 13.95 88.2 61.04 88.2 114.945 0 53.904-36.134 100.994-88.2 114.945l4.66 17.387C386.81 372.295 428.5 317.962 428.5 256c0-61.963-41.69-116.295-101.54-132.332zm-12.425 46.365l-4.658 17.387C340.96 195.748 362.5 223.822 362.5 256s-21.54 60.252-52.623 68.58l4.658 17.387C353.402 331.552 380.5 296.237 380.5 256c0-40.238-27.098-75.552-65.965-85.967zm-12.424 46.363l-4.657 17.387C307.55 236.49 314.5 245.547 314.5 256s-6.95 19.51-17.047 22.217l4.658 17.387c17.884-4.792 30.39-21.09 30.39-39.604 0-18.513-12.506-34.812-30.39-39.604z",
		url: "https://game-icons.net/1x1/delapouite/speaker.html",
	},
	off: {
		d: "M275.5 96l-96 96h-96v128h96l96 96V96zm50.863 89.637l-12.726 12.726L371.273 256l-57.636 57.637 12.726 12.726L384 268.727l57.637 57.636 12.726-12.726L396.727 256l57.636-57.637-12.726-12.726L384 243.273l-57.637-57.636z",
		url: "https://game-icons.net/1x1/delapouite/speaker-off.html",
	},
	/** Square crop around both glyphs so they don't jump when swapped. */
	viewBox: "68 55 402 402",
} as const;
