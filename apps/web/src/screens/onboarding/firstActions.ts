/**
 * Where each newly opened mechanic's first action lives, as coach targets. A screen may mark
 * the element with data-coach="<id>"; until it does, the screen's own class is used.
 */
import type { UnlockId } from "@/client/state";
import reliquary from "@/screens/reliquary/reliquary.module.css";
import spire from "@/screens/spire/spire.module.css";
import vestry from "@/screens/vestry/vestry.module.css";
import type { Tab } from "@/ui/TabBar";

const cls = (name: string | undefined) =>
	name
		? `.${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(name) : name}`
		: null;
const either = (id: string, name: string | undefined) =>
	[`[data-coach="${id}"]`, cls(name)].filter(Boolean).join(", ");

/** Mechanics whose first opening points at one action, and the target of that action. */
export const FIRST_ACTION: Partial<Record<UnlockId, () => string>> = {
	vigil: () => `[data-coach="collect"]`,
	spire: () => either("climb", spire.climbBtn),
	reliquary: () => either("scry", reliquary.cta),
	vestry: () => either("pack", vestry.pack),
};

/** The tab each mechanic lives on. */
export const HOME: Record<UnlockId, Tab> = {
	fragment: "fragment",
	gathering: "gathering",
	vigil: "fragment",
	retune: "fragment",
	marks: "fragment",
	spire: "spire",
	reliquary: "reliquary",
	vestry: "vestry",
};
