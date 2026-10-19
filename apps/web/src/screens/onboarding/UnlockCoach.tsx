"use client";

/**
 * After onboarding: the first visit to something newly opened. On its tab, a coach mark points
 * at its first action (Vigil: Collect, Spire: Climb, Reliquary: Scry, Vestry: a pack); things
 * with no single action (Retune, Marks, the Gathering) only rise in with their reveal. Either
 * way it is then acknowledged, so it never plays again. One at a time, in unlock order.
 */
import { useEffect } from "react";
import { type GameState, type UnlockId, useGameState } from "@/client/state";
import { onboarding as T } from "@/lexicon/onboarding";
import { Coach } from "@/ui/coach/Coach";
import { findAnchor } from "@/ui/coach/useAnchor";
import type { Tab } from "@/ui/TabBar";
import { FIRST_ACTION, HOME } from "./firstActions";

/** How long a reveal is left to play before it counts as seen. */
const REVEAL_MS = 2600;
/** Give up pointing at an action that never shows (e.g. nothing to buy). */
const FIND_MS = 8000;

export function UnlockCoach({ tab }: { tab: Tab }) {
	const { state, ack } = useGameState();
	const here = state?.onboarding.done
		? (state.fresh.find((id) => HOME[id] === tab && ready(id, state)) ?? null)
		: null;
	return here ? <One key={here} id={here} ack={ack} /> : null;
}

/** The Vigil is pointed at once there is something in it to collect. */
function ready(id: UnlockId, state: GameState): boolean {
	if (id !== "vigil") return true;
	const v = state.profile?.vigil;
	return !!v && (v.ash > 0 || v.resonance > 0);
}

function One({
	id,
	ack,
}: {
	id: UnlockId;
	ack: (ids: UnlockId[]) => Promise<void>;
}) {
	const target = FIRST_ACTION[id]?.() ?? null;

	useEffect(() => {
		const t = setTimeout(
			() => {
				// No action to point at, or it never showed: the reveal was enough.
				if (!target || !findAnchor(target)) void ack([id]);
			},
			target ? FIND_MS : REVEAL_MS,
		);
		return () => clearTimeout(t);
	}, [id, target, ack]);

	if (!target) return null;
	const text = T.first[id as keyof typeof T.first];
	return <Coach target={target} text={text} onDone={() => void ack([id])} />;
}
