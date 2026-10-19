"use client";

/**
 * The Fragment tab. Unbound: the binding ritual. Bound but not yet sealed:
 * the waiting states. Bound: the Stage.
 */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type Me, useApi } from "@/client/api";
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
	const [me, setMe] = useState<Me | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [fresh, setFresh] = useState(false);
	// While the wax is being poured, stay on the ritual even once the server knows.
	const [holding, setHolding] = useState(false);
	const lastStatus = useRef<string | null | undefined>(undefined);

	const refresh = useCallback(async () => {
		try {
			const next = await api.me();
			const st = next.fragment?.status ?? null;
			// Saw it go from unsealed to bound in this sitting: strike "Bound" once.
			if (
				lastStatus.current !== undefined &&
				lastStatus.current !== "confirmed" &&
				st === "confirmed"
			)
				setFresh(true);
			lastStatus.current = st;
			setMe(next);
			setErr(null);
		} catch (e) {
			setErr(
				e instanceof ApiError && e.status === 503
					? L.errors.unavailable
					: L.errors.noVoice,
			);
		}
	}, [api]);

	useEffect(() => {
		refresh();
		const t = setInterval(refresh, 5000);
		return () => clearInterval(t);
	}, [refresh]);

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
								refresh();
							}}
						/>
					)}
					{phase === "waiting" && f && (
						<Waiting api={api} fragment={f} onDone={refresh} />
					)}
					{phase === "stage" && f && me && (
						<Stage
							api={api}
							fragment={f}
							boutActive={me.boutActive}
							fresh={fresh}
							onDone={refresh}
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
