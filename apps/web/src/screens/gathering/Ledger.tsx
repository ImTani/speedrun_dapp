"use client";

// The Ledger of Light: a plaque at the foot of the nave that opens a sheet of every Fragment's Light.
import {
	AnimatePresence,
	motion,
	type PanInfo,
	useDragControls,
} from "motion/react";
import { useEffect, useId, useRef } from "react";
import { gathering as T } from "@/lexicon/gathering.ts";
import { Grip, IconButton, SelectableCard } from "@/ui/controls";
import { Mask } from "@/ui/Mask";
import { scrim, sheet } from "@/ui/motion";
import { Rubric } from "@/ui/type";
import { useBackToClose } from "@/ui/useBackToClose";
import css from "./gathering.module.css";
import { aspectName, low } from "./model.ts";
import type { StandingsRow } from "./types.ts";

export function LedgerButton({
	rows,
	mine,
	onOpen,
}: {
	rows: StandingsRow[];
	mine: string | null;
	onOpen: () => void;
}) {
	const top = rows.slice(0, 3);
	const place = mine ? rows.findIndex((r) => low(r.agent) === mine) + 1 : 0;
	const leader = rows[0];
	const sub =
		place > 0
			? T.standing(place)
			: leader
				? T.leader(leader.name || T.nameless)
				: T.ledgerEmpty;
	// A plain tappable card (no `selected`): the chamfered plaque, and the focus ring that
	// follows its corners.
	return (
		<SelectableCard
			className={css.ledgerBtn}
			onClick={onOpen}
			onPanEnd={(_, info: PanInfo) => {
				if (info.offset.y < -24) onOpen();
			}}
			aria-label={T.ledgerOpen}
			aria-haspopup="dialog"
		>
			{top.length > 0 && (
				<span className={css.ledgerMasks} aria-hidden="true">
					{top.map((r) => (
						<Mask key={r.agent} aspect={r.aspect} size={30} />
					))}
				</span>
			)}
			<span className={css.ledgerText}>
				<Rubric size="xs" tone="gilt">
					{T.ledger}
				</Rubric>
				<span className={css.ledgerSub}>{sub}</span>
			</span>
			<svg className={css.chev} viewBox="0 0 14 14" aria-hidden="true">
				<path
					d="M2 9.5 7 4.5l5 5"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</SelectableCard>
	);
}

export function LedgerSheet({
	open,
	rows,
	mine,
	onClose,
}: {
	open: boolean;
	rows: StandingsRow[];
	mine: string | null;
	onClose: () => void;
}) {
	const drag = useDragControls();
	const titleId = useId();
	const closeRef = useRef<HTMLButtonElement>(null);
	// Android back closes the sheet rather than leaving the app.
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
						drag="y"
						dragControls={drag}
						dragListener={false}
						dragConstraints={{ top: 0, bottom: 0 }}
						dragElastic={{ top: 0.04, bottom: 0.7 }}
						onDragEnd={(_, info) => {
							if (info.offset.y > 110 || info.velocity.y > 600) onClose();
						}}
					>
						<div className={css.sheetHead} onPointerDown={(e) => drag.start(e)}>
							<Grip className={css.sheetGrip} />
							<h2 id={titleId} className={css.sheetTitle}>
								{T.ledgerTitle}
							</h2>
							<IconButton
								ref={closeRef}
								icon="close"
								label={T.close}
								size="sm"
								className={css.sheetClose}
								onClick={onClose}
								onPointerDown={(e) => e.stopPropagation()}
							/>
						</div>
						{rows.length === 0 ? (
							<p className={css.empty}>{T.ledgerEmpty}</p>
						) : (
							<ol className={css.rows}>
								{rows.map((r, i) => {
									const isMine = !!mine && low(r.agent) === mine;
									return (
										<li
											key={r.agent}
											className={css.row}
											data-mine={isMine ? "true" : "false"}
										>
											<span
												className={css.rank}
												data-top={i < 3 ? "true" : "false"}
											>
												{i + 1}
											</span>
											<span className={css.rowMask} aria-hidden="true">
												<Mask aspect={r.aspect} size={40} />
											</span>
											<span className={css.rowName}>
												<span className={css.rowTitle}>
													{r.name || T.nameless}
												</span>
												<span className={css.rowAspect}>
													{aspectName(r.aspect)}
												</span>
											</span>
											<span
												className={css.rowLight}
												data-neg={r.light < 0 ? "true" : "false"}
											>
												{r.light}
												<small>{T.light}</small>
											</span>
										</li>
									);
								})}
							</ol>
						)}
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
