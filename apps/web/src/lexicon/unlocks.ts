// Staggered unlocks: what each mechanic is called and one short line on how to open it.
import type { UnlockId, UnlockNeed } from "@/game/unlocks.ts";

export const unlocks = {
	name: {
		fragment: "Fragment",
		gathering: "Gathering",
		vigil: "Vigil",
		retune: "Retune Sigils",
		spire: "Spire",
		marks: "Marks",
		reliquary: "Reliquary",
		vestry: "Vestry",
	} satisfies Record<UnlockId, string>,
	/** How to open it. */
	need: {
		always: "Open from the start",
		bind: "Bind a Fragment",
		seal: "Seal your Fragment",
		firstDuel: "Fight 1 duel",
		threeDuels: "Fight 3 duels",
		earnMark: "Earn a Mark",
		clearFloor: "Clear a Spire floor",
		scryOnce: "Scry once",
	} satisfies Record<UnlockNeed, string>,
	/** Toast on a locked tab: "Vestry · Scry once to open". */
	lockedToast: (name: string, need: string) => `${name} · ${need} to open`,
	/** Tag on something just opened. */
	opened: "New",
	/** Heading when something opens: "Spire opened". */
	openedLine: (name: string) => `${name} opened`,
	/** Label on a closed tab or action. */
	locked: "Locked",
	/** Shown when the server refuses a closed action. */
	stillLocked: "Not open yet.",
} as const;
