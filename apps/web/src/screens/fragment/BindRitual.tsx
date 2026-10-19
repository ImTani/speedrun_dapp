"use client";

/**
 * Binding a Fragment, as a ritual in three steps:
 *   I   The Mask    choose the Aspect (swipe the rose)
 *   II  The Sigils  carve how it behaves
 *   III The Name    speak (or divine) its name, then bind it: the wax is poured.
 */
import {
	DEFAULT_KNOBS,
	encodeConfig,
	type Knobs,
	type StrategyId,
} from "@arena/strategies";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { L } from "@/lexicon";
import { coachAct } from "@/ui/coach/signal";
import { Mask } from "@/ui/Mask";
import {
	haptic,
	IMPACT,
	impact,
	pressable,
	spring,
	useShake,
} from "@/ui/motion";
import { Plate, Rubric, Slam } from "@/ui/type";
import { AspectCarousel } from "./AspectCarousel";
import s from "./fragment.module.css";
import { SigilEditor } from "./SigilEditor";
import { type Api, divineName, errText, wait } from "./shared";
import { WaxSeal } from "./WaxSeal";

type Step = 0 | 1 | 2;

const stepSwap = {
	enter: (d: number) => ({ opacity: 0, x: 36 * d, filter: "blur(4px)" }),
	center: { opacity: 1, x: 0, filter: "blur(0px)" },
	exit: (d: number) => ({ opacity: 0, x: -28 * d, filter: "blur(3px)" }),
};

export function BindRitual({
	api,
	onHold,
	onBound,
}: {
	api: Api;
	/** Hold this screen while the pour plays (true), or let it go after a failure (false). */
	onHold: (hold: boolean) => void;
	/** Called once the wax is poured and the request is in. */
	onBound: () => void;
}) {
	const [step, setStep] = useState<Step>(0);
	const [dir, setDir] = useState(1);
	const [aspect, setAspect] = useState(2);
	const [aspectDir, setAspectDir] = useState(1);
	const [knobs, setKnobs] = useState<Knobs>(DEFAULT_KNOBS);
	const [name, setName] = useState("");
	const [divined, setDivined] = useState(0);
	const [pour, setPour] = useState<
		null | "falling" | "poured" | "failed" | "done"
	>(null);
	const [err, setErr] = useState<string | null>(null);
	const shaker = useShake<HTMLDivElement>();

	const trimmed = name.trim();
	const nameOk = trimmed.length >= 1 && trimmed.length <= 24;
	const a = L.aspects[aspect] ?? L.aspects[0];

	const goto = (n: Step) => {
		setDir(n > step ? 1 : -1);
		setStep(n);
		haptic(10);
	};

	const bind = async () => {
		if (!nameOk || pour) return;
		setErr(null);
		setPour("falling");
		onHold(true);
		const config = encodeConfig({
			strategy: aspect as StrategyId,
			knobs,
		}).toString();
		// The wax falls while the request travels; both must land.
		const [res] = await Promise.allSettled([
			api.createFragment(trimmed, config),
			wait(900),
		]);
		if (res.status === "rejected") {
			setPour("failed");
			onHold(false);
			setErr(errText(res.reason));
			await impact(shaker, IMPACT.ruin);
			await wait(900);
			setPour(null);
			return;
		}
		setPour("poured");
	};

	return (
		<div className={s.ritual} ref={shaker.ref}>
			{/* Portaled: no ancestor transform or filter may capture the fixed overlay. */}
			{typeof document !== "undefined"
				? createPortal(
						<AnimatePresence>
							{pour === "falling" || pour === "poured" ? (
								<PourOverlay
									key="pour"
									aspect={aspect}
									name={trimmed}
									poured={pour === "poured"}
									onDone={() => {
										setPour("done");
										setTimeout(onBound, 380);
									}}
								/>
							) : null}
						</AnimatePresence>,
						document.body,
					)
				: null}
			<header className={s.ritualHead}>
				{step > 0 ? (
					<motion.button
						type="button"
						className={s.back}
						onClick={() => goto((step - 1) as Step)}
						aria-label={L.bind.back}
						disabled={!!pour}
						{...pressable}
					>
						<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
							<path
								d="M16 3 L6 12 L16 21"
								fill="none"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</motion.button>
				) : (
					<span className={s.backSpacer} />
				)}
				<div className={s.steps}>
					<Rubric tone="dim" size="xs">
						{L.bind.heading}
					</Rubric>
					<ol className={s.stepPips}>
						{L.bind.steps.map((label, i) => (
							<li
								key={label}
								className={s.pip}
								data-on={i === step ? "1" : i < step ? "past" : "0"}
								aria-current={i === step ? "step" : undefined}
							>
								<span className={s.pipMark}>{L.bind.stepMark[i]}</span>
								<span className={s.pipLabel}>{label}</span>
							</li>
						))}
					</ol>
				</div>
				<span className={s.backSpacer} />
			</header>

			<div className={s.ritualBody}>
				<AnimatePresence mode="wait" custom={dir} initial={false}>
					<motion.div
						key={step}
						className={s.stepPane}
						custom={dir}
						variants={stepSwap}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
					>
						{step === 0 && (
							<>
								<p className={s.lead}>{L.bind.chooseAspect}</p>
								<AspectCarousel
									aspect={aspect}
									dir={aspectDir}
									onPick={(i, d) => {
										setAspectDir(d);
										setAspect(i);
									}}
								/>
							</>
						)}
						{step === 1 && (
							<>
								<div className={s.sigilsHead}>
									<Mask aspect={aspect} size={56} glow />
									<div>
										<h2 className={s.h2}>{L.bind.sigilsHeading}</h2>
										<p className={s.hint}>{a.name}</p>
									</div>
								</div>
								<SigilEditor
									aspect={aspect}
									knobs={knobs}
									onChange={(k) => {
										setKnobs(k);
										coachAct("sigil");
									}}
									coach
								/>
							</>
						)}
						{step === 2 && (
							<div className={s.nameStep}>
								<h2 className={s.h2}>{L.bind.nameHeading}</h2>
								<p className={s.hint}>{L.bind.nameHint}</p>
								<motion.div
									key={divined}
									initial={divined ? { scale: 0.94, opacity: 0.4 } : false}
									animate={{ scale: 1, opacity: 1 }}
									transition={spring.slam}
									className={s.namePlate}
								>
									<Plate
										name={trimmed || "…"}
										epithet={L.hero.aspectLine(a.name, a.mask)}
										emblem={<Mask aspect={aspect} size={46} glow />}
										size="lg"
									/>
								</motion.div>
								<label className={s.nameField} data-coach="name">
									<span className="sr-only">{L.bind.nameLabel}</span>
									<input
										value={name}
										maxLength={24}
										placeholder={L.bind.namePlaceholder}
										onChange={(e) => {
											setName(e.target.value);
											if (e.target.value.trim()) coachAct("name");
										}}
										disabled={!!pour}
										autoComplete="off"
										autoCapitalize="words"
										spellCheck={false}
										enterKeyHint="done"
									/>
								</label>
								<motion.button
									type="button"
									className={s.divine}
									disabled={!!pour}
									onClick={() => {
										setName(divineName(name));
										coachAct("name");
										setDivined((n) => n + 1);
										haptic(12);
									}}
									{...pressable}
								>
									<svg
										viewBox="0 0 24 24"
										width="22"
										height="22"
										aria-hidden="true"
									>
										<path
											d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9Z"
											fill="currentColor"
											stroke="#0b0807"
											strokeWidth="1.4"
											strokeLinejoin="round"
										/>
									</svg>
									{L.bind.divine}
								</motion.button>
								<span className={s.waxWaits} aria-hidden="true">
									<WaxSeal aspect={aspect} state="cold" size={84} />
								</span>
							</div>
						)}
					</motion.div>
				</AnimatePresence>
			</div>

			<footer className={s.ritualFoot}>
				{err && <p className="banner">{err}</p>}
				{step < 2 ? (
					<motion.button
						type="button"
						className="btn btn-blood"
						onClick={() => {
							// Moving on counts as having chosen (the coach marks follow).
							coachAct(step === 0 ? "mask" : "sigil");
							goto((step + 1) as Step);
						}}
						{...pressable}
					>
						{step === 0 ? L.bind.wear : L.bind.carve}
					</motion.button>
				) : (
					<motion.button
						type="button"
						className="btn btn-blood"
						onClick={bind}
						data-coach="bind"
						disabled={!nameOk || !!pour}
						{...pressable}
					>
						{pour ? L.bind.binding : L.bind.submit}
					</motion.button>
				)}
			</footer>
		</div>
	);
}

/**
 * The wax falls and splashes onto the vow; the name is struck. Holds on the
 * molten drop until the request has landed (`poured`), then plays out.
 */
function PourOverlay({
	aspect,
	name,
	poured,
	onDone,
}: {
	aspect: number;
	name: string;
	poured: boolean;
	onDone: () => void;
}) {
	const shaker = useShake<HTMLDivElement>();
	return (
		<motion.div
			className={s.overlay}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0, transition: { duration: 0.3 } }}
			transition={{ duration: 0.2 }}
		>
			<div className={s.overlayInner} ref={shaker.ref}>
				<motion.div
					className={s.drop}
					initial={{ y: "-55vh", scaleX: 0.42, scaleY: 0.58 }}
					animate={
						poured
							? { y: 0, scaleX: [0.42, 1.24, 1], scaleY: [0.58, 0.74, 1] }
							: {
									y: "-6vh",
									scaleX: [0.42, 0.46, 0.42],
									scaleY: [0.58, 0.52, 0.58],
								}
					}
					transition={
						poured
							? {
									y: { duration: 0.3, ease: [0.7, 0, 0.84, 0] },
									scaleX: { duration: 0.52, times: [0, 0.58, 1] },
									scaleY: { duration: 0.52, times: [0, 0.58, 1] },
								}
							: {
									y: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
									scaleX: { duration: 0.9, repeat: Number.POSITIVE_INFINITY },
									scaleY: { duration: 0.9, repeat: Number.POSITIVE_INFINITY },
								}
					}
					onAnimationComplete={() => {
						if (poured) impact(shaker, IMPACT.kindle);
					}}
				>
					<WaxSeal aspect={aspect} state="poured" size={150} />
				</motion.div>
				{poured ? (
					<Slam
						text={name}
						kicker={L.bind.poured}
						tone="kindle"
						delay={0.42}
						onDone={() => setTimeout(onDone, 700)}
						className={s.pourSlam ?? ""}
					/>
				) : null}
			</div>
		</motion.div>
	);
}
