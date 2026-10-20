"use client";

/**
 * The first sitting, taught by doing. Driven by the shared onboarding step and the Fragment's
 * status, one coach mark (or the practice duel) at a time:
 *   mask      the mask rose          advances on a pick (swipe, arrow, strip) or "Choose"
 *   sigil     the first Sigil        advances on a change or "Next" (skipped for Madness)
 *   name      the name field         advances on typing or a suggested name
 *   bind      the Bind button        advances on the tap
 *   practice  while it wakes: three tolls by hand against a Remnant
 *   seal      the wax, once it can be sealed
 *   gathering the Gathering tab, once bound: then onboarding is done
 * Every step is saved (setStep); Skip ends it (finish). A returning player (done) sees nothing.
 * Each mark done rings a soft chime (Coach); the seal presses wax with a sparkle; the Gathering's
 * mark arrives as an unlock (cue and gold ring).
 */
import type { AgentConfig, StrategyId } from "@arena/strategies";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSfx } from "@/audio";
import type { FragmentStatus } from "@/client/api";
import {
	type GameState,
	ONBOARDING_STEPS,
	type OnboardingStep,
	useGameState,
} from "@/client/state";
import { onboarding as T } from "@/lexicon/onboarding";
import { configOf } from "@/screens/fragment/shared";
import { Coach } from "@/ui/coach/Coach";
import { findAnchor, useAnchorPresent } from "@/ui/coach/useAnchor";
import type { Tab } from "@/ui/TabBar";
import { sealMoment, unlockMoment } from "./juice";
import { Practice } from "./Practice";

const WARM = ["seal", "unlock", "light"] as const;

const at = (s: OnboardingStep | null) => (s ? ONBOARDING_STEPS.indexOf(s) : -1);

/**
 * The step to show now, from the saved step and where the Fragment really is. The status
 * wins: a player who bound elsewhere, or came back later, lands on the right step.
 */
export function effectiveStep(
	saved: OnboardingStep | null,
	status: FragmentStatus | null,
): OnboardingStep | null {
	const i = at(saved);
	switch (status) {
		case null:
			// Not bound yet. Past "bind" with no Fragment: the wax is still falling (or the
			// binding did not take, which the ritual shows itself).
			return i <= at("bind") ? (saved ?? "mask") : null;
		case "requested":
			// Past practice: the seal waits for the Fragment to wake.
			return i <= at("practice") ? "practice" : null;
		case "registered":
			// Past the seal: it is being carried (or failed, which the screen says itself).
			return i <= at("practice")
				? "practice"
				: i === at("seal")
					? "seal"
					: null;
		case "confirmed":
			return "gathering";
		default:
			return null; // failed: the Fragment tab says so; nothing to coach.
	}
}

const NEXT: Partial<Record<OnboardingStep, OnboardingStep>> = {
	mask: "sigil",
	sigil: "name",
	name: "bind",
	bind: "practice",
	practice: "seal",
	seal: "gathering",
};

export function Onboarding({ tab }: { tab: Tab }) {
	const { state, setStep, finish, ack } = useGameState();
	if (!state || state.onboarding.done) return null;
	return (
		<Script
			state={state}
			tab={tab}
			setStep={setStep}
			finish={async () => {
				await finish();
				if (state.fresh.includes("gathering")) await ack(["gathering"]);
			}}
		/>
	);
}

function Script({
	state,
	tab,
	setStep,
	finish,
}: {
	state: GameState;
	tab: Tab;
	setStep: (s: OnboardingStep | null) => Promise<void>;
	finish: () => Promise<void>;
}) {
	const f = state.me.fragment;
	const saved = state.onboarding.step;
	const step = effectiveStep(saved, f?.status ?? null);
	const onFragment = tab === "fragment";
	useSfx(WARM);

	// Each move is sent once, however many signals ask for it.
	const sent = useRef<OnboardingStep | "done" | null>(saved);
	const go = useCallback(
		(to: OnboardingStep) => {
			if (sent.current === to || sent.current === "done") return;
			sent.current = to;
			void setStep(to);
		},
		[setStep],
	);
	const end = useCallback(() => {
		if (sent.current === "done") return;
		sent.current = "done";
		void finish();
	}, [finish]);

	// Save forward moves made by the world (bound elsewhere, sealed, came back later).
	useEffect(() => {
		if (step && at(step) > at(saved)) go(step);
	}, [step, saved, go]);

	// Steps before the Fragment exists: if the ritual is already further on (the player
	// moved ahead without the coach, or Madness has no Sigils), follow it.
	const pre = step === "mask" || step === "sigil" || step === "name";
	const hasSigil = useAnchorPresent(pre ? "sigil" : null);
	const hasName = useAnchorPresent(pre ? "name" : null);
	useEffect(() => {
		if (step === "mask" && hasSigil) go("sigil");
		else if ((step === "mask" || step === "sigil") && hasName) go("name");
	}, [step, hasSigil, hasName, go]);

	// The practice duel waits for the waiting window (after the wax has fallen).
	const waking = useAnchorPresent(step === "practice" ? "waiting" : null);
	// Keyed on the packed config: the state is re-read every few seconds.
	const packed = f?.config ?? null;
	const config = useMemo<AgentConfig | null>(() => {
		if (packed == null) return null;
		const { aspect, knobs } = configOf(packed);
		return { strategy: aspect as StrategyId, knobs };
	}, [packed]);

	// The Gathering step waits out the "Bound" lettering on the Fragment tab.
	const [settled, setSettled] = useState(false);
	useEffect(() => {
		if (step !== "gathering") return;
		const t = setTimeout(() => setSettled(true), onFragment ? 3600 : 0);
		return () => clearTimeout(t);
	}, [step, onFragment]);

	// Already on the Gathering: nothing left to point at.
	useEffect(() => {
		if (step === "gathering" && tab === "gathering") end();
	}, [step, tab, end]);

	const advance = (from: OnboardingStep) => () => {
		const to = NEXT[from];
		if (to) go(to);
		else end();
	};

	let coach: {
		target: string;
		text: string;
		round: boolean;
		above?: boolean;
	} | null = null;
	if (step && onFragment) {
		if (
			step === "mask" ||
			step === "sigil" ||
			step === "name" ||
			step === "bind"
		)
			// The mask's name sits under the rose: keep the line above it.
			coach = {
				target: step,
				text: T.coach[step],
				round: false,
				above: step === "mask",
			};
		else if (step === "seal" && f?.status === "registered")
			coach = { target: "seal", text: T.coach.seal, round: true };
	}
	if (step === "gathering" && settled && tab !== "gathering")
		coach = { target: "tab-gathering", text: T.coach.gathering, round: true };

	return (
		<>
			{coach ? (
				<Coach
					key={coach.target}
					target={coach.target}
					text={coach.text}
					round={coach.round}
					above={coach.above ?? false}
					chime={coach.target !== "seal"}
					{...(coach.target === "tab-gathering"
						? { onShown: unlockMoment }
						: {})}
					onDone={
						step === "gathering"
							? end
							: coach.target === "seal"
								? () => {
										sealMoment(findAnchor("seal"));
										advance("seal")();
									}
								: advance(step ?? "mask")
					}
					onSkip={end}
				/>
			) : null}
			<AnimatePresence>
				{step === "practice" && onFragment && waking && config && f ? (
					<Practice
						key="practice"
						config={config}
						name={f.name}
						onDone={advance("practice")}
					/>
				) : null}
			</AnimatePresence>
		</>
	);
}
