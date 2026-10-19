"use client";

/**
 * First-run guide: four short steps over the shell, shown once after the first sign-in
 * (localStorage), skippable. Swipe or tap Next; Escape skips.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { economy } from "@/lexicon/economy";
import { tutorial as T } from "@/lexicon/tutorial";
import { Mask } from "@/ui/Mask";
import { haptic, pressable, spring } from "@/ui/motion";
import { Count } from "@/ui/type";
import s from "./tutorial.module.css";

export const TUTORIAL_KEY = "apostasy.tutorial.seen";

function seen(): boolean {
	try {
		return localStorage.getItem(TUTORIAL_KEY) === "1";
	} catch {
		return true; // no storage: never nag
	}
}

function markSeen() {
	try {
		localStorage.setItem(TUTORIAL_KEY, "1");
	} catch {
		// Private mode: it may show again next time.
	}
}

/** Mount once inside the signed-in app: shows the guide if this browser hasn't seen it. */
export function FirstRun() {
	const [show, setShow] = useState(false);
	useEffect(() => {
		if (!seen()) setShow(true);
	}, []);
	return (
		<AnimatePresence>
			{show ? (
				<Tutorial
					key="tutorial"
					onDone={() => {
						markSeen();
						setShow(false);
					}}
				/>
			) : null}
		</AnimatePresence>
	);
}

const COUNT = T.steps.length;

export function Tutorial({ onDone }: { onDone: () => void }) {
	const [[step, dir], setStep] = useState<[number, number]>([0, 1]);
	const next = useRef<HTMLButtonElement>(null);
	const last = step === COUNT - 1;

	const go = (to: number) => {
		if (to < 0 || to >= COUNT) return;
		haptic(6);
		setStep([to, Math.sign(to - step) || 1]);
	};

	useEffect(() => {
		next.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onDone();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onDone]);

	const t = T.steps[step] ?? T.steps[0];

	return (
		<motion.div
			className={s.root}
			role="dialog"
			aria-modal="true"
			aria-label={T.label}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0, transition: { duration: 0.25 } }}
		>
			<div className={s.top}>
				<button type="button" className={s.skip} onClick={onDone}>
					{T.skip}
				</button>
			</div>

			<AnimatePresence mode="wait" initial={false} custom={dir}>
				<motion.div
					key={step}
					className={s.page}
					custom={dir}
					initial={{ opacity: 0, x: 40 * dir }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -40 * dir, transition: { duration: 0.14 } }}
					transition={spring.settle}
					drag="x"
					dragConstraints={{ left: 0, right: 0 }}
					dragElastic={0.25}
					onDragEnd={(_, info) => {
						if (info.offset.x < -60) go(step + 1);
						else if (info.offset.x > 60) go(step - 1);
					}}
				>
					<div className={s.art} aria-hidden="true">
						<Art step={step} />
					</div>
					<p className={s.count}>{T.stepOf(step + 1, COUNT)}</p>
					<h2 className={s.title}>{t.title}</h2>
					<p className={s.line}>{t.line}</p>
				</motion.div>
			</AnimatePresence>

			<div className={s.foot}>
				<div className={s.dots}>
					{T.steps.map((st, i) => (
						<button
							key={st.title}
							type="button"
							className={s.dot}
							data-on={i === step || undefined}
							aria-label={T.stepOf(i + 1, COUNT)}
							aria-current={i === step ? "step" : undefined}
							onClick={() => go(i)}
						>
							<span />
						</button>
					))}
				</div>
				<motion.button
					ref={next}
					type="button"
					className={s.next}
					onClick={() => (last ? onDone() : go(step + 1))}
					{...pressable}
				>
					{last ? T.done : T.next}
				</motion.button>
			</div>
		</motion.div>
	);
}

// ---------------------------------------------------------------- art

function Art({ step }: { step: number }) {
	if (step === 0) return <BindArt />;
	if (step === 1) return <DuelArt />;
	if (step === 2) return <VigilArt />;
	return <SpireArt />;
}

/** A mask settles in; three Sigil notches slide into place under it. */
function BindArt() {
	return (
		<div className={s.bind}>
			<motion.div
				initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
				animate={{ scale: 1, opacity: 1, rotate: 0 }}
				transition={{ ...spring.slam, delay: 0.1 }}
			>
				<Mask aspect={2} size={104} glow />
			</motion.div>
			<div className={s.sigils}>
				{[0.7, 0.35, 0.55].map((v, i) => (
					<span key={v} className={s.sigil}>
						<motion.span
							className={s.sigilFill}
							initial={{ scaleX: 0 }}
							animate={{ scaleX: v }}
							transition={{ ...spring.soft, delay: 0.45 + i * 0.12 }}
						/>
					</span>
				))}
			</div>
		</div>
	);
}

/** Two Fragments meet in the middle, again and again. */
function DuelArt() {
	const reduce = useReducedMotion() ?? false;
	const loop = reduce
		? {}
		: {
				repeat: Number.POSITIVE_INFINITY,
				repeatDelay: 0.5,
				duration: 1.4,
				ease: "easeInOut" as const,
			};
	return (
		<div className={s.duel}>
			<motion.div animate={reduce ? {} : { x: [0, 26, 0] }} transition={loop}>
				<Mask aspect={1} size={84} glow />
			</motion.div>
			<motion.span
				className={s.clash}
				animate={
					reduce
						? { opacity: 1 }
						: { opacity: [0, 0, 1, 0], scale: [0.4, 0.4, 1.3, 0.6] }
				}
				transition={{ ...loop, times: [0, 0.4, 0.5, 0.75] }}
			/>
			<motion.div animate={reduce ? {} : { x: [0, -26, 0] }} transition={loop}>
				<Mask aspect={4} size={84} glow />
			</motion.div>
		</div>
	);
}

/** The Vigil fills while you're away; Ash adds up. */
function VigilArt() {
	return (
		<div className={s.vigil}>
			<div className={s.candle}>
				<motion.span
					className={s.candleFill}
					initial={{ scaleY: 0.08 }}
					animate={{ scaleY: 1 }}
					transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
				/>
			</div>
			<div className={s.vigilCount}>
				<Count
					value={96}
					from={0}
					duration={1.6}
					size="xl"
					tone="gilt"
					showDelta={false}
				/>
				<span className={s.vigilUnit}>{economy.ash}</span>
			</div>
		</div>
	);
}

/** Five floors light from the bottom up; the top one is the Remnant. */
function SpireArt() {
	return (
		<div className={s.spire}>
			{[5, 4, 3, 2, 1].map((f) => (
				<motion.span
					key={f}
					className={s.floor}
					data-top={f === 5 || undefined}
					style={{ width: `${48 + (5 - f) * 9}%` }}
					initial={{ opacity: 0.25 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2 + (f - 1) * 0.22, duration: 0.3 }}
				/>
			))}
		</div>
	);
}
