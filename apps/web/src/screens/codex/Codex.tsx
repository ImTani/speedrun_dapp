"use client";

/**
 * How to play: one tall sheet, five short illustrated sections. The premise, your Fragment
 * (mask = temperament, Sigils = tuning), Gatherings (paired, sealed, unveiled, the Light
 * table), what to do between Gatherings, and a small glossary. A row of section links stays
 * at the top; the sheet can open scrolled to one section (the tab intros link here).
 *
 *   <Codex open={open} onClose={close} section="gathering" />
 *
 * Load it through CodexSheet / useCodex (./index.tsx), which fetch this on first use.
 * Portalled to <body>: it may be opened from under a transformed parent (a shaking header,
 * another sheet).
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { VIGIL_CAP_HOURS } from "@/game/economy";
import { SCRY_COST } from "@/game/reliquary";
import { FLOORS } from "@/game/spire";
import { L } from "@/lexicon";
import { type CodexSection, codex as T } from "@/lexicon/codex";
import {
	GLYPHS,
	Grip,
	IconButton,
	SecondaryButton,
	TextButton,
} from "@/ui/controls";
import {
	DevourGlyph,
	KindleGlyph,
	MedalGlyph,
	SealedGlyph,
	TabGlyph,
} from "@/ui/intro/glyphs";
import { LightTable } from "@/ui/intro/LightTable";
import { Mask } from "@/ui/Mask";
import { scrim, sheet } from "@/ui/motion";
import { Rubric } from "@/ui/type";
import { useBackToClose } from "@/ui/useBackToClose";
import s from "./codex.module.css";
import { ShatteredRose } from "./Rose";

const SECTIONS: readonly CodexSection[] = [
	"premise",
	"fragment",
	"gathering",
	"between",
	"words",
];

const SIGILS = [
	"forgiveness",
	"retaliation",
	"memory",
	"opening",
	"noise",
] as const;

/** The three beats of a toll, each with its little picture. */
const STEP_ART = [
	<span key="paired" className={s.stepArt}>
		<Mask aspect={2} size={30} shadow={false} />
		<Mask aspect={1} size={30} shadow={false} />
	</span>,
	<span key="sealed" className={s.stepArt}>
		<SealedGlyph size={26} />
		<SealedGlyph size={26} />
	</span>,
	<span key="unveiled" className={s.stepArt}>
		<KindleGlyph size={26} />
		<DevourGlyph size={26} />
	</span>,
];

const NUMERALS = ["I", "II", "III"];

export function Codex({
	open,
	onClose,
	section,
}: {
	open: boolean;
	onClose: () => void;
	section?: CodexSection | undefined;
}) {
	const headId = useId();
	const closeRef = useRef<HTMLButtonElement>(null);
	const body = useRef<HTMLDivElement>(null);
	const reduce = useReducedMotion() ?? false;
	// Android back closes the sheet rather than leaving the app.
	useBackToClose(open, onClose);

	useEffect(() => {
		if (!open) return;
		const back = document.activeElement as HTMLElement | null;
		closeRef.current?.focus({ preventScroll: true });
		// Captured and stopped here: a sheet underneath must not close on the same key.
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			e.stopImmediatePropagation();
			onClose();
		};
		window.addEventListener("keydown", onKey, true);
		return () => {
			window.removeEventListener("keydown", onKey, true);
			back?.focus?.({ preventScroll: true });
		};
	}, [open, onClose]);

	const jump = (k: CodexSection, smooth: boolean) => {
		const scroller = body.current;
		const el = scroller?.querySelector<HTMLElement>(`[data-section="${k}"]`);
		if (!scroller || !el) return;
		scroller.scrollTo({
			top: Math.max(0, el.offsetTop - 8),
			behavior: smooth && !reduce ? "smooth" : "auto",
		});
	};

	// Opened on a section: start there.
	// biome-ignore lint/correctness/useExhaustiveDependencies: once per opening
	useEffect(() => {
		if (!open || !section) return;
		const raf = requestAnimationFrame(() => jump(section, false));
		return () => cancelAnimationFrame(raf);
	}, [open, section]);

	if (typeof document === "undefined") return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<div className={s.layer} key="codex">
					<motion.div
						className={s.scrim}
						variants={scrim}
						initial="hidden"
						animate="shown"
						exit="gone"
						onClick={onClose}
						aria-hidden="true"
					/>
					<motion.section
						className={s.sheet}
						role="dialog"
						aria-modal="true"
						aria-labelledby={headId}
						variants={sheet}
						initial="hidden"
						animate="shown"
						exit="gone"
					>
						<header className={s.head}>
							<Grip className={s.grip} />
							<h2 id={headId} className={s.title}>
								{T.heading}
							</h2>
							<IconButton
								ref={closeRef}
								icon="close"
								label={T.close}
								size="sm"
								className={s.close}
								onClick={onClose}
							/>
							<nav className={s.nav} aria-label={T.jumpTo}>
								{SECTIONS.map((k) => (
									<TextButton
										key={k}
										className={s.navLink}
										onClick={() => jump(k, true)}
									>
										{T.nav[k]}
									</TextButton>
								))}
							</nav>
						</header>

						<div ref={body} className={s.body}>
							{/* ---- the premise */}
							<section className={s.section} data-section="premise">
								<Rubric as="h3" rule="both" className={s.rubric ?? ""}>
									{T.head.premise}
								</Rubric>
								<div className={s.premise}>
									<ShatteredRose size={104} />
									<div className={s.premiseText}>
										{T.premise.map((l) => (
											<p key={l} className={s.line}>
												{l}
											</p>
										))}
									</div>
								</div>
							</section>

							{/* ---- your Fragment */}
							<section className={s.section} data-section="fragment">
								<Rubric as="h3" rule="both" className={s.rubric ?? ""}>
									{T.head.fragment}
								</Rubric>
								<p className={s.lead}>{T.fragment.masks}</p>
								<ul className={s.masks}>
									{L.aspects.map((a, i) => (
										<li key={a.key} className={s.maskRow}>
											<span className={s.maskArt} aria-hidden="true">
												<Mask aspect={i} size={40} />
											</span>
											<span className={s.maskName}>{a.name}</span>
											<span className={s.maskLine}>{a.blurb}</span>
										</li>
									))}
								</ul>
								<p className={s.lead}>{T.fragment.sigils}</p>
								<dl className={s.terms}>
									{SIGILS.map((k) => (
										<div key={k} className={s.term}>
											<dt>{L.sigils[k].name}</dt>
											<dd>{T.fragment.sigil[k]}</dd>
										</div>
									))}
								</dl>
								<p className={s.note}>{T.fragment.retune}</p>
							</section>

							{/* ---- Gatherings */}
							<section className={s.section} data-section="gathering">
								<Rubric as="h3" rule="both" className={s.rubric ?? ""}>
									{T.head.gathering}
								</Rubric>
								<p className={s.lead}>{T.gathering.lead}</p>
								<ol className={s.steps}>
									{T.gathering.steps.map((st, i) => (
										<li key={st.head} className={s.step}>
											<span className={s.stepNum} aria-hidden="true">
												{NUMERALS[i]}
											</span>
											{STEP_ART[i]}
											<span className={s.stepText}>
												<span className={s.stepHead}>{st.head}</span>
												<span className={s.stepLine}>{st.line}</span>
											</span>
										</li>
									))}
								</ol>
								<Rubric as="h4" size="xs" className={s.subRubric ?? ""}>
									{T.gathering.table}
								</Rubric>
								<LightTable />
								<p className={s.line}>{T.gathering.lesson}</p>
								<p className={s.note}>{T.gathering.auto}</p>
							</section>

							{/* ---- between Gatherings */}
							<section className={s.section} data-section="between">
								<Rubric as="h3" rule="both" className={s.rubric ?? ""}>
									{T.head.between}
								</Rubric>
								<ul className={s.places}>
									<Place
										icon={GLYPHS.hourglass}
										name={T.between.vigil.name}
										line={T.between.vigil.line(VIGIL_CAP_HOURS)}
									/>
									<Place
										icon={<TabGlyph tab="spire" />}
										name={T.between.spire.name}
										line={T.between.spire.line(FLOORS)}
									/>
									<Place
										icon={<TabGlyph tab="reliquary" />}
										name={T.between.reliquary.name}
										line={T.between.reliquary.line(SCRY_COST)}
									/>
									<Place
										icon={<TabGlyph tab="vestry" />}
										name={T.between.vestry.name}
										line={T.between.vestry.line}
									/>
									<Place
										icon={<MedalGlyph />}
										name={T.between.marks.name}
										line={T.between.marks.line}
									/>
								</ul>
							</section>

							{/* ---- words */}
							<section className={s.section} data-section="words">
								<Rubric as="h3" rule="both" className={s.rubric ?? ""}>
									{T.head.words}
								</Rubric>
								<dl className={s.words}>
									{T.words.map(([w, m]) => (
										<div key={w} className={s.word}>
											<dt>{w}</dt>
											<dd>{m}</dd>
										</div>
									))}
								</dl>
							</section>

							<SecondaryButton className={s.done} onClick={onClose}>
								{T.close}
							</SecondaryButton>
						</div>
					</motion.section>
				</div>
			)}
		</AnimatePresence>,
		document.body,
	);
}

function Place({
	icon,
	name,
	line,
}: {
	icon: ReactNode;
	name: string;
	line: string;
}) {
	return (
		<li className={s.place}>
			<span className={s.placeIcon} aria-hidden="true">
				{icon}
			</span>
			<span className={s.placeText}>
				<span className={s.placeName}>{name}</span>
				<span className={s.placeLine}>{line}</span>
			</span>
		</li>
	);
}
