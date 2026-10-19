"use client";

/**
 * The Fragment tab. Unbound: the binding ritual. Bound but not yet sealed:
 * the waiting states. Bound: the Stage.
 */
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ApiError, useApi } from "@/client/api";
import { useGameState } from "@/client/state";
import { L } from "@/lexicon";
import { GlassWindow } from "@/ui/GlassWindow";
import { Rubric } from "@/ui/type";
import { BindRitual } from "./BindRitual";
import s from "./fragment.module.css";
import { Stage } from "./Stage";
import { Waiting } from "./Waiting";

type Phase = "entering" | "bind" | "waiting" | "stage";

export function FragmentScreen() {
	const api = useApi();
	// One shared read of /api/state (polled by the shell) instead of a poll of our own.
	const { state, error, refresh } = useGameState();
	const me = state?.me ?? null;
	const err = error
		? error instanceof ApiError && error.status === 503
			? L.errors.unavailable
			: L.errors.noVoice
		: null;
	const [fresh, setFresh] = useState(false);
	// While the wax is being poured, stay on the ritual even once the server knows.
	const [holding, setHolding] = useState(false);
	const st = me ? (me.fragment?.status ?? null) : undefined;
	const [seen, setSeen] = useState<string | null | undefined>(undefined);
	// Saw it go from unsealed to bound in this sitting: strike "Bound" once. Adjusted
	// during render so the Stage mounts already knowing.
	if (st !== undefined && st !== seen) {
		if (seen !== undefined && seen !== "confirmed" && st === "confirmed")
			setFresh(true);
		setSeen(st);
	}

	const done = () => {
		void refresh();
	};

	const f = me?.fragment ?? null;
	const phase: Phase = !me
		? "entering"
		: holding || !f
			? "bind"
			: f.status !== "confirmed"
				? "waiting"
				: "stage";

	return (
		<section className={s.screen}>
			{err && me ? <p className="banner">{err}</p> : null}
			<AnimatePresence mode="wait" initial={false}>
				{/* Opacity only: a transform or filter here would capture fixed overlays. */}
				<motion.div
					key={phase}
					className={s.phase}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.32 }}
				>
					{phase === "entering" && <Entering err={err} />}
					{phase === "bind" && (
						<BindRitual
							api={api}
							onHold={setHolding}
							onBound={() => {
								setHolding(false);
								done();
							}}
						/>
					)}
					{phase === "waiting" && f && (
						<Waiting api={api} fragment={f} onDone={done} />
					)}
					{phase === "stage" && f && me && (
						<Stage
							api={api}
							fragment={f}
							boutActive={me.boutActive}
							fresh={fresh}
							onDone={done}
						/>
					)}
				</motion.div>
			</AnimatePresence>
		</section>
	);
}

/** Before the cathedral answers: an unlit window and a held breath. */
function Entering({ err }: { err: string | null }) {
	return (
		<div className={s.entering}>
			<div className={s.windowWrap} data-small="1">
				<GlassWindow aspect={2} mood="dark" mask={false} shader={false} />
			</div>
			<Rubric
				as="p"
				rule="both"
				tone={err ? "blood" : "dim"}
				className={err ? "" : (s.breathe ?? "")}
			>
				{err ?? L.entering}
			</Rubric>
		</div>
	);
}
