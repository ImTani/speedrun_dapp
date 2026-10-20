/**
 * Which face every primary call-to-action wears. One constant switches them all
 * (title Enter, Bind, Climb, Scry, Buy, Collect, the landing's Play...).
 *
 *   "current" - the red gradient slabs as they shipped (each screen's own class)
 *   "enamel"  - oxblood enamel plaque in a bevelled gilt frame, gothic-cut corners
 *   "glass"   - red stained-glass panes in lead cames, backlit
 *   "arch"    - umber stone tablet under an ogee crest, gilt beading, a red jewel
 *   "wax"     - a bar of red sealing wax with a seal stamped at the leading end
 *
 * For comparison without a rebuild, any page takes `?btn=<look>` (kept for the tab's
 * session; `?btn=` with no value clears it). The sheet: /_brand/buttons (dev only).
 */
export const BUTTON_LOOKS = [
	"current",
	"enamel",
	"glass",
	"arch",
	"wax",
] as const;

export type ButtonLook = (typeof BUTTON_LOOKS)[number];

/** The shipped look. Unchanged until the owner picks. */
export const BUTTON_STYLE: ButtonLook = "current";

export const isButtonLook = (v: unknown): v is ButtonLook =>
	typeof v === "string" && (BUTTON_LOOKS as readonly string[]).includes(v);
