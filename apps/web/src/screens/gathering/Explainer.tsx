"use client";

/**
 * The Gathering's "?": a short sheet on what is on screen right now. Who faces whom (yours
 * marked), the three beats of a toll with the one under way lit, what is happening this
 * moment, how many tolls the Gathering runs, the Light table, and that your Fragment plays on
 * its own. Fetched on the first tap (GatheringScreen loads it lazily).
 *
 *   <Explainer open={open} onClose={close} pair={pair} phase="commit" ... />
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { codex } from "@/lexicon/codex";
import { Grip, IconButton, TextButton } from "@/ui/controls";
import { LightTable } from "@/ui/intro/LightTable";
import { Mask } from "@/ui/Mask";
import { scrim, sheet } from "@/ui/motion";
import { Rubric } from "@/ui/type";
import { useBackToClose } from "@/ui/useBackToClose";
import css from "./explain.module.css";
import type { SideKey, Who } from "./model.ts";

const T = codex.explain;

export type ExplainPhase = "commit" | "reveal" | "between" | "closed";

/** Which of the three beats (paired, choosing, unveiled) each phase is in. */
const STEP_OF: Record<ExplainPhase, number> = {
	commit: 1,
	reveal: 2,
	between: 2,
	closed: -1,
};

export default function Explainer({
	open,
	onClose,
	onMore,
	pair,
	phase,
	vision,
	rounds,
	perRival,
}: {
	open: boolean;
	onClose: () => void;
	/** "More in How to play": the caller closes this and opens the Codex. */
	onMore: () => void;
	pair: Record<SideKey, Who> | null;
	phase: ExplainPhase;
	/** The server is silent: the screen is replaying the last Gathering. */
	vision: boolean;
	/** Tolls in this Gathering (0 when none is held). */
	rounds: number;
	/** Tolls each pairing lasts. */
	perRival: number;
}) {
	const titleId = useId();
	const closeRef = useRef<HTMLButtonElement>(null);
	useBackToClose(open, onClose);

	useEffect(() => {
		if (!open) return;
		const back = document.activeElement as HTMLElement | null;
		closeRef.current?.focus({ preventScroll: true });
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
			back?.focus?.({ preventScroll: true });
		};
	}, [open, onClose]);

	const mine = pair
		? pair.A.mine
			? pair.A
			: pair.B.mine
				? pair.B
				: null
		: null;
	const rival = pair && mine ? (mine === pair.A ? pair.B : pair.A) : null;
	const facing = !pair
		? T.empty
		: mine && rival
			? T.facingMine(mine.name, rival.name)
			: T.facing(pair.A.name, pair.B.name);
	const now = vision ? T.now.vision : T.now[phase];
	const step = vision ? -1 : STEP_OF[phase];

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="scrim"
						className={css.scrim}
						variants={scrim}
						initial="hidden"
						animate="shown"
						exit="gone"
						onClick={onClose}
						aria-hidden="true"
					/>
					<motion.div
						key="sheet"
						className={css.sheet}
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						variants={sheet}
						initial="hidden"
						animate="shown"
						exit="gone"
					>
						<div className={css.head}>
							<Grip className={css.grip} />
							<h2 id={titleId} className={css.title}>
								{T.heading}
							</h2>
							<IconButton
								ref={closeRef}
								icon="close"
								label={T.close}
								size="sm"
								className={css.close}
								onClick={onClose}
							/>
						</div>

						<div className={css.body}>
							{pair ? (
								<div className={css.pair} aria-hidden="true">
									<Side who={pair.A} />
									<span className={css.vs}>×</span>
									<Side who={pair.B} />
								</div>
							) : null}
							<p className={css.lead}>{facing}</p>
							{pair && !mine ? <p className={css.line}>{T.others}</p> : null}

							<ol className={css.steps}>
								{T.steps.map((label, i) => (
									<li
										key={label}
										className={css.step}
										data-now={i === step || undefined}
										aria-current={i === step ? "step" : undefined}
									>
										<span className={css.stepNum} aria-hidden="true">
											{i + 1}
										</span>
										{label}
									</li>
								))}
							</ol>
							<p className={css.now}>{now}</p>
							{rounds > 0 ? (
								<p className={css.line}>
									{T.tolls(rounds, Math.max(1, perRival))}
								</p>
							) : null}

							<Rubric as="h3" size="xs" className={css.rubric ?? ""}>
								{T.table}
							</Rubric>
							<LightTable />

							<p className={css.auto}>{T.auto}</p>
							<TextButton className={css.more} onClick={onMore}>
								{T.more}
							</TextButton>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

function Side({ who }: { who: Who }) {
	return (
		<span className={css.side} data-mine={who.mine || undefined}>
			<Mask aspect={who.aspect} size={44} />
			<span className={css.sideName}>{who.name}</span>
			{who.mine ? <span className={css.sideTag}>{T.yours}</span> : null}
		</span>
	);
}
