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
import { type RefObject, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buzz, HAPTIC, play } from "@/audio";
import { fx } from "@/fx";
import { L } from "@/lexicon";
import { useKeepAboveKeyboard } from "@/ui/appFrame";
import { PrimaryButton } from "@/ui/button";
import { coachAct } from "@/ui/coach/signal";
import { IconButton, SecondaryButton, TextInput } from "@/ui/controls";
import { Mask } from "@/ui/Mask";
import { IMPACT, impact, spring, useShake } from "@/ui/motion";
import { Plate, Rubric, Slam } from "@/ui/type";
import { AspectCarousel } from "./AspectCarousel";
import s from "./fragment.module.css";
import { SigilEditor } from "./SigilEditor";
import { type Api, divineName, errText, wait } from "./shared";
import { WaxSeal } from "./WaxSeal";

type Step = 0 | 1 | 2;

/** The server's limit (app/api/fragment/route.ts). */
const NAME_MAX = 24;
/** The count shows from here on. */
const NAME_COUNT_FROM = 18;

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
	const bindRef = useRef<HTMLButtonElement>(null);

	const trimmed = name.trim();
	const nameOk = trimmed.length >= 1 && trimmed.length <= NAME_MAX;
	const a = L.aspects[aspect] ?? L.aspects[0];

	const goto = (n: Step) => {
		setDir(n > step ? 1 : -1);
		setStep(n);
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
			play("error");
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
					<IconButton
						icon="back"
						label={L.bind.back}
						size="sm"
						className={s.back}
						haptic={10}
						onClick={() => goto((step - 1) as Step)}
						disabled={!!pour}
					/>
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
								<NameField
									name={name}
									disabled={!!pour}
									action={bindRef}
									onChange={(v) => {
										setName(v);
										if (v.trim()) coachAct("name");
									}}
								/>
								<SecondaryButton
									inline
									icon={<Star />}
									disabled={!!pour}
									haptic={12}
									onClick={() => {
										setName(divineName(name));
										coachAct("name");
										setDivined((n) => n + 1);
									}}
								>
									{L.bind.divine}
								</SecondaryButton>
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
					<PrimaryButton
						key="next"
						legacy="btn btn-blood"
						onClick={() => {
							// Moving on counts as having chosen (the coach marks follow).
							coachAct(step === 0 ? "mask" : "sigil");
							goto((step + 1) as Step);
						}}
					>
						{step === 0 ? L.bind.wear : L.bind.carve}
					</PrimaryButton>
				) : (
					// Keyed apart from "Next": motion binds its ref once, at mount.
					<PrimaryButton
						key="bind"
						ref={bindRef}
						legacy="btn btn-blood"
						burst
						onClick={bind}
						data-coach="bind"
						disabled={!nameOk || !!pour}
						loading={!!pour}
					>
						{pour ? L.bind.binding : L.bind.submit}
					</PrimaryButton>
				)}
			</footer>
		</div>
	);
}

/**
 * The name field. While the keyboard is up, the field and the Bind button (`action`) both stay in
 * sight (the footer joins the flow under the field, see fragment.module.css). "Done" on the
 * keyboard closes it, leaving Bind right there.
 */
function NameField({
	name,
	disabled,
	action,
	onChange,
}: {
	name: string;
	disabled: boolean;
	action: RefObject<HTMLButtonElement | null>;
	onChange: (v: string) => void;
}) {
	const input = useRef<HTMLInputElement>(null);
	useKeepAboveKeyboard(input, action);
	const fieldId = useId();
	const n = name.length;
	const showCount = n >= NAME_COUNT_FROM;
	return (
		<div className={s.nameField} data-coach="name">
			<label htmlFor={fieldId} className="sr-only">
				{L.bind.nameLabel}
			</label>
			<TextInput
				id={fieldId}
				ref={input}
				size="lg"
				value={name}
				maxLength={NAME_MAX}
				placeholder={L.bind.namePlaceholder}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						e.currentTarget.blur();
					}
				}}
				disabled={disabled}
				autoComplete="off"
				autoCorrect="off"
				autoCapitalize="words"
				spellCheck={false}
				enterKeyHint="done"
				aria-describedby={showCount ? "name-count" : undefined}
			/>
			{showCount ? (
				<span
					id="name-count"
					className={s.nameCount}
					data-full={n >= NAME_MAX ? "1" : undefined}
					aria-live="polite"
				>
					<span aria-hidden="true">{L.bind.nameCount(n, NAME_MAX)}</span>
					<span className="sr-only">{L.bind.nameCountLabel(NAME_MAX - n)}</span>
				</span>
			) : null}
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
	const drop = useRef<HTMLDivElement>(null);
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
					ref={drop}
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
						if (!poured) return;
						// The wax lands on the vow: a heavy seal and a ring of embers.
						play("seal");
						buzz(HAPTIC.seal);
						if (drop.current)
							fx.burst("embers", drop.current, { amount: 0.9, scale: 1.1 });
						impact(shaker, { ...IMPACT.kindle, buzz: false });
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

/** The divining star: the Suggest-a-name glyph (in place of the secondary's gilt seal). */
function Star() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9Z"
				fill="currentColor"
				stroke="#0b0807"
				strokeWidth="1.4"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
