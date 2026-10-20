"use client";

/**
 * Sigils as game controls: notched brass rails you drag along (tap a notch to
 * jump), and three carved tiles for the First Gesture. Each Sigil reads back,
 * live, what the Fragment will do. Only the Sigils that matter to the Aspect
 * are shown.
 */
import { KNOB_BOUNDS, type Knobs } from "@arena/strategies";
import { AnimatePresence, motion } from "motion/react";
import {
	type KeyboardEvent,
	type PointerEvent,
	useCallback,
	useId,
	useRef,
} from "react";
import { buzz } from "@/audio";
import { L } from "@/lexicon";
import { Chip } from "@/ui/controls";
import { spring } from "@/ui/motion";
import s from "./fragment.module.css";
import { sigilsFor } from "./shared";

/** The short engraved reading of a Sigil's value (tiles, summaries). */
export function sigilValue(key: keyof Knobs, v: number): string {
	return L.short[key](v);
}

// Clemency is cut in fives (21 notches); the rest notch every whole step.
const STEP: Record<keyof Knobs, number> = {
	forgiveness: 5,
	retaliation: 1,
	memory: 1,
	opening: 1,
	noise: 1,
};

export function SigilEditor({
	aspect,
	knobs,
	onChange,
	disabled = false,
	coach = false,
}: {
	aspect: number;
	knobs: Knobs;
	onChange: (k: Knobs) => void;
	disabled?: boolean;
	/** Mark the first Sigil as a coach target (onboarding). */
	coach?: boolean;
}) {
	const keys = sigilsFor(aspect);
	if (keys.length === 0)
		return (
			<div className={s.noSigils}>
				<p className={s.noSigilsHead}>{L.bind.noSigils}</p>
				<p className={s.hint}>{L.bind.noSigilsHint}</p>
			</div>
		);
	return (
		<motion.ul
			className={s.sigils}
			initial="hidden"
			animate="shown"
			variants={{ shown: { transition: { staggerChildren: 0.07 } } }}
		>
			{keys.map((key, i) => (
				<motion.li
					key={key}
					className={s.sigil}
					data-coach={coach && i === 0 ? "sigil" : undefined}
					variants={{
						hidden: { opacity: 0, y: 14 },
						shown: {
							opacity: 1,
							y: 0,
							transition: { ...spring.settle, opacity: { duration: 0.2 } },
						},
					}}
				>
					<SigilCard
						k={key}
						value={knobs[key]}
						disabled={disabled}
						onValue={(v) => onChange({ ...knobs, [key]: v })}
					/>
				</motion.li>
			))}
		</motion.ul>
	);
}

function SigilCard({
	k,
	value,
	onValue,
	disabled,
}: {
	k: keyof Knobs;
	value: number;
	onValue: (v: number) => void;
	disabled: boolean;
}) {
	const id = useId();
	const sig = L.sigils[k];
	const reading = L.reading[k](value);
	return (
		<>
			<div className={s.sigilHead}>
				<span className={s.sigilName} id={`${id}n`}>
					{sig.name}
				</span>
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.span
						key={sigilValue(k, value)}
						className={s.sigilVal}
						initial={{ opacity: 0, y: -8, scale: 1.25 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, transition: { duration: 0.1 } }}
						transition={spring.snappy}
					>
						{sigilValue(k, value)}
					</motion.span>
				</AnimatePresence>
			</div>
			{k === "opening" ? (
				<GestureTiles
					value={value}
					onValue={onValue}
					disabled={disabled}
					labelledBy={`${id}n`}
				/>
			) : (
				<NotchRail
					value={value}
					min={KNOB_BOUNDS[k].min}
					max={KNOB_BOUNDS[k].max}
					step={STEP[k]}
					onValue={onValue}
					disabled={disabled}
					labelledBy={`${id}n`}
					valueText={reading}
				/>
			)}
			<p className={s.sigilReading} aria-hidden="true">
				<AnimatePresence mode="wait" initial={false}>
					<motion.span
						key={reading}
						initial={{ opacity: 0, filter: "blur(3px)" }}
						animate={{ opacity: 1, filter: "blur(0px)" }}
						exit={{ opacity: 0, transition: { duration: 0.08 } }}
						transition={{ duration: 0.22 }}
					>
						{reading}
					</motion.span>
				</AnimatePresence>
			</p>
		</>
	);
}

/** A notched brass rail. Drag the rivet, tap a notch, or use the arrow keys. */
function NotchRail({
	value,
	min,
	max,
	step,
	onValue,
	disabled,
	labelledBy,
	valueText,
}: {
	value: number;
	min: number;
	max: number;
	step: number;
	onValue: (v: number) => void;
	disabled: boolean;
	labelledBy: string;
	valueText: string;
}) {
	const railRef = useRef<HTMLDivElement>(null);
	const live = useRef(value);
	live.current = value;
	const notches = Math.round((max - min) / step) + 1;
	const pct = ((value - min) / (max - min)) * 100;

	const set = useCallback(
		(raw: number) => {
			const v = Math.min(
				max,
				Math.max(min, min + Math.round((raw - min) / step) * step),
			);
			if (v !== live.current) {
				live.current = v;
				buzz(6);
				onValue(v);
			}
		},
		[min, max, step, onValue],
	);

	const fromX = (clientX: number) => {
		const r = railRef.current?.getBoundingClientRect();
		if (!r) return;
		const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
		set(min + t * (max - min));
	};

	const down = (e: PointerEvent<HTMLDivElement>) => {
		if (disabled) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		fromX(e.clientX);
	};
	const move = (e: PointerEvent<HTMLDivElement>) => {
		if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
		fromX(e.clientX);
	};
	const key = (e: KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;
		const big = Math.max(step, Math.round((max - min) / 5 / step) * step);
		const next: Record<string, number> = {
			ArrowLeft: value - step,
			ArrowDown: value - step,
			ArrowRight: value + step,
			ArrowUp: value + step,
			PageDown: value - big,
			PageUp: value + big,
			Home: min,
			End: max,
		};
		if (e.key in next) {
			e.preventDefault();
			set(next[e.key] as number);
		}
	};

	return (
		<div
			className={s.rail}
			role="slider"
			tabIndex={disabled ? -1 : 0}
			aria-labelledby={labelledBy}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={value}
			aria-valuetext={valueText}
			aria-disabled={disabled || undefined}
			data-disabled={disabled || undefined}
			onPointerDown={down}
			onPointerMove={move}
			onKeyDown={key}
		>
			<div className={s.railGroove} ref={railRef}>
				<motion.div
					className={s.railFill}
					initial={false}
					animate={{ width: `${pct}%` }}
					transition={spring.snappy}
				/>
				{Array.from({ length: notches }, (_, i) => {
					const at = (i / (notches - 1)) * 100;
					const major =
						notches <= 11 || i % 5 === 0 || i === notches - 1 ? "1" : "0";
					return (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: notches are positional
							key={i}
							className={s.notch}
							data-major={major}
							data-past={at <= pct ? "1" : "0"}
							style={{ left: `${at}%` }}
						/>
					);
				})}
				<motion.span
					className={s.rivet}
					initial={false}
					animate={{ left: `${pct}%` }}
					transition={spring.snappy}
				>
					<motion.span
						key={value}
						className={s.rivetFace}
						initial={{ scale: 1.22, rotate: 45 }}
						animate={{ scale: 1, rotate: 45 }}
						transition={spring.press}
					/>
				</motion.span>
			</div>
		</div>
	);
}

/** Three carved tiles: offer light, strike first, or let fate decide. */
function GestureTiles({
	value,
	onValue,
	disabled,
	labelledBy,
}: {
	value: number;
	onValue: (v: number) => void;
	disabled: boolean;
	labelledBy: string;
}) {
	return (
		<div className={s.gestures} role="radiogroup" aria-labelledby={labelledBy}>
			{L.firstGesture.map((g, i) => (
				<Chip
					key={g}
					kind="radio"
					size="lg"
					selected={value === i}
					disabled={disabled}
					className={s.gesture}
					data-kind={["kindle", "devour", "fate"][i]}
					haptic={value === i ? false : 10}
					onClick={() => onValue(i)}
				>
					<span className={s.gestureBody}>
						<GestureGlyph kind={i} />
						<span className={s.gestureName}>{g}</span>
					</span>
				</Chip>
			))}
		</div>
	);
}

/** Small carved glyphs: a flame (Kindle), a fanged maw (Devour), a die (Fate). */
function GestureGlyph({ kind }: { kind: number }) {
	if (kind === 0)
		return (
			<svg viewBox="0 0 32 32" className={s.gestureGlyph} aria-hidden="true">
				<path
					d="M16 3 C21 10 25 13 24 20 C23.4 25.5 20 29 16 29 C12 29 8.6 25.5 8 20 C7.4 15 11 12.5 12 8 C14 11 14.6 12 15.4 14 C16.8 11 17 7 16 3Z"
					fill="currentColor"
					stroke="#0b0807"
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
				<path
					d="M16 16 C18.6 19 19.4 21 19 23.4 C18.6 25.6 17.4 26.6 16 26.6 C14.6 26.6 13.4 25.6 13 23.4 C12.8 21.4 14.6 19.6 16 16Z"
					fill="#fff3c4"
					opacity=".85"
				/>
			</svg>
		);
	if (kind === 1)
		return (
			<svg viewBox="0 0 32 32" className={s.gestureGlyph} aria-hidden="true">
				<path
					d="M3 10 Q16 2 29 10 L26 13 L23 11 L20.5 15 L18 11.5 L16 16 L14 11.5 L11.5 15 L9 11 L6 13Z"
					fill="currentColor"
					stroke="#0b0807"
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
				<path
					d="M3 22 Q16 30 29 22 L26 19 L23 21 L20.5 17 L18 20.5 L16 16.5 L14 20.5 L11.5 17 L9 21 L6 19Z"
					fill="currentColor"
					stroke="#0b0807"
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
			</svg>
		);
	return (
		<svg viewBox="0 0 32 32" className={s.gestureGlyph} aria-hidden="true">
			<path
				d="M16 3 L28 9.5 L28 22.5 L16 29 L4 22.5 L4 9.5Z"
				fill="currentColor"
				stroke="#0b0807"
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path
				d="M4 9.5 L16 16 L28 9.5 M16 16 V29"
				fill="none"
				stroke="#0b0807"
				strokeWidth="1.4"
				opacity=".7"
			/>
			<circle cx="16" cy="9.6" r="1.7" fill="#0b0807" />
			<circle cx="9" cy="17" r="1.5" fill="#0b0807" />
			<circle cx="10.5" cy="22" r="1.5" fill="#0b0807" />
			<circle cx="22" cy="17.4" r="1.5" fill="#0b0807" />
			<circle cx="23.5" cy="22.2" r="1.5" fill="#0b0807" />
		</svg>
	);
}
