"use client";

/**
 * Moments that play over whatever screen is up. Today: a Degree reached.
 *
 *   promoteMoment(4);   // from the Spire (boss cleared) or the HUD (Degree seen to drop)
 *   <Moments />         // once, in the shell
 *
 * Each Degree is celebrated once per sitting, whoever saw it first. The overlay never takes a
 * touch and clears itself.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { buzz, HAPTIC, play } from "@/audio";
import { FX, fx } from "@/fx";
import { economy } from "@/lexicon/economy";
import { moments as M } from "@/lexicon/moments";
import { Slam } from "@/ui/type";
import s from "./moments.module.css";

let current: { degree: number; id: number } | null = null;
let seq = 0;
const seen = new Set<number>();
const subs = new Set<() => void>();
const emit = () => {
	for (const f of subs) f();
};

/** Play the promotion moment for `degree` (no-op if this Degree was already shown). */
export function promoteMoment(degree: number): void {
	if (seen.has(degree)) return;
	seen.add(degree);
	current = { degree, id: ++seq };
	emit();
}

const subscribe = (f: () => void) => {
	subs.add(f);
	return () => {
		subs.delete(f);
	};
};
const get = () => current;
const getServer = () => null;

const HOLD_MS = 2900;

export function Moments() {
	const m = useSyncExternalStore(subscribe, get, getServer);
	const [shown, setShown] = useState<typeof m>(null);

	useEffect(() => {
		if (!m) return;
		setShown(m);
		const t = setTimeout(() => {
			setShown(null);
			if (current === m) current = null;
		}, HOLD_MS);
		return () => clearTimeout(t);
	}, [m]);

	return (
		<AnimatePresence>
			{shown ? (
				<motion.div
					key={shown.id}
					className={s.layer}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0, transition: { duration: 0.45 } }}
					transition={{ duration: 0.2 }}
				>
					<Slam
						text={economy.degreeOf(shown.degree)}
						kicker={M.promoted}
						sub={M.promotedLine}
						tone="kindle"
						delay={0.2}
						onImpact={() => {
							play("promote");
							buzz(HAPTIC.promote);
							const at = {
								x: window.innerWidth / 2,
								y: window.innerHeight * 0.44,
							};
							const big = Math.min(window.innerWidth, 520) * 0.62;
							fx.ring(at, FX.gilt, { radius: big, width: 12, duration: 0.9 });
							fx.ring(at, FX.giltHi, {
								radius: big * 0.6,
								width: 6,
								duration: 0.7,
								delay: 0.08,
							});
							fx.burst("unlock", at, { amount: 1.3, scale: 1.2 });
						}}
					/>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
