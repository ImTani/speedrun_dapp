"use client";

/**
 * Between binding and bound, staged in the fiction (no spinners):
 *   requested  the Fragment stirs: light breathes behind cold glass, embers rise.
 *   registered the wax is warm: press your seal (a brass signet strikes the wax).
 *   sealing    the bells carry the seal: the imprint glows while the nave answers.
 *   failed     the glass is cracked.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { FragmentRow } from "@/client/api";
import { L } from "@/lexicon";
import { GlassWindow, type WindowMood } from "@/ui/GlassWindow";
import { haptic, IMPACT, impact, pressable, useShake } from "@/ui/motion";
import { Plate, Rubric } from "@/ui/type";
import s from "./fragment.module.css";
import { type Api, aspectOf, wait } from "./shared";
import { Signet, WaxSeal, type WaxState } from "./WaxSeal";

type Phase = "idle" | "stamping" | "sealing" | "cracked";

export function Waiting({
	api,
	fragment,
	onDone,
}: {
	api: Api;
	fragment: FragmentRow;
	onDone: () => void;
}) {
	const { aspect } = aspectOf(fragment);
	const a = L.aspects[aspect] ?? L.aspects[0];
	const [phase, setPhase] = useState<Phase>("idle");
	const [err, setErr] = useState<string | null>(null);
	const shaker = useShake<HTMLDivElement>();
	const st = fragment.status;

	const seal = async () => {
		if (phase !== "idle") return;
		setErr(null);
		setPhase("stamping");
		haptic(10);
		// The signet strikes first; the nave answers after.
		const op = api.runPlayerOp({ action: "confirm" }).then(
			(ok) => ok,
			() => false,
		);
		await wait(330);
		await impact(shaker, IMPACT.kindle);
		setPhase("sealing");
		const ok = await op;
		if (ok) {
			onDone();
			return;
		}
		setPhase("cracked");
		setErr(L.status.sealFailed);
		await impact(shaker, IMPACT.devour);
		await wait(1400);
		setPhase("idle");
	};

	const mood: WindowMood =
		st === "failed"
			? "broken"
			: st === "requested"
				? "stirring"
				: phase === "sealing"
					? "stirring"
					: "waiting";
	const wax: WaxState =
		st === "requested"
			? "cold"
			: phase === "cracked"
				? "cracked"
				: phase === "sealing"
					? "pressed"
					: "poured";

	const title =
		st === "failed"
			? L.status.failed
			: st === "requested"
				? L.status.stirs
				: phase === "sealing" || phase === "stamping"
					? L.status.sealing
					: L.status.registered;
	const hint =
		st === "failed"
			? L.status.failedHint
			: st === "requested"
				? L.status.requestedHint
				: null;

	return (
		<div className={s.waiting} ref={shaker.ref} data-coach="waiting">
			<div className={s.windowWrap} data-size="waiting">
				<GlassWindow aspect={aspect} mood={mood} />
				{mood === "stirring" ? <Embers /> : null}
			</div>
			<Plate
				name={fragment.name}
				epithet={L.hero.aspectLine(a.name, a.mask)}
				size="md"
				className={s.stagePlate ?? ""}
			/>
			<div className={s.statusBlock} aria-live="polite">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={title}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, transition: { duration: 0.1 } }}
						transition={{ duration: 0.3 }}
					>
						<Rubric
							as="p"
							rule="both"
							tone={st === "failed" ? "blood" : "gilt"}
							className={
								st === "requested" || phase === "sealing"
									? (s.breathe ?? "")
									: ""
							}
						>
							{title}
						</Rubric>
						{hint ? <p className={s.hint}>{hint}</p> : null}
					</motion.div>
				</AnimatePresence>
			</div>

			{st !== "failed" ? (
				<div className={s.sealBox}>
					<motion.button
						type="button"
						className={s.sealButton}
						data-coach="seal"
						data-live={st === "registered" && phase === "idle" ? "1" : "0"}
						disabled={st !== "registered" || phase !== "idle"}
						onClick={seal}
						aria-label={L.status.seal}
						{...pressable}
					>
						<WaxSeal aspect={aspect} state={wax} size={116} />
						<AnimatePresence>
							{phase === "stamping" ? (
								<motion.span
									key="signet"
									className={s.signetFall}
									initial={{ y: -150, scale: 1.5, opacity: 0, rotate: -18 }}
									animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
									exit={{
										y: -170,
										opacity: 0,
										scale: 1.2,
										transition: { duration: 0.4 },
									}}
									transition={{ duration: 0.33, ease: [0.7, 0, 0.84, 0] }}
								>
									<Signet aspect={aspect} size={116} />
								</motion.span>
							) : null}
						</AnimatePresence>
					</motion.button>
					{st === "registered" && phase === "idle" ? (
						<span className={s.sealLabel}>{L.status.seal}</span>
					) : null}
				</div>
			) : null}
			{err && <p className="banner">{err}</p>}
		</div>
	);
}

/** Embers rising off the sill while the Fragment wakes. */
function Embers() {
	const reduce = useReducedMotion();
	if (reduce) return null;
	return (
		<div className={s.embers} aria-hidden="true">
			{Array.from({ length: 11 }, (_, i) => {
				const x = 12 + ((i * 37) % 76);
				const d = 3.2 + ((i * 7) % 5) * 0.55;
				return (
					<motion.span
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed set of motes
						key={i}
						className={s.ember}
						style={{ left: `${x}%` }}
						initial={{ y: 0, opacity: 0 }}
						animate={{
							y: [0, -90 - (i % 4) * 40],
							x: [0, (i % 2 ? 1 : -1) * (6 + (i % 3) * 5)],
							opacity: [0, 0.9, 0],
						}}
						transition={{
							duration: d,
							delay: (i * 0.43) % 3,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeOut",
						}}
					/>
				);
			})}
		</div>
	);
}
