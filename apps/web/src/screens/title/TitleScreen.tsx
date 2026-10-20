"use client";

/**
 * The title: the lit nave, the name struck into the dark, one way in.
 *
 *   <TitleScreen ready={ready} onEnter={login} />
 *
 * `ready` false shows the doors still groaning (the enter slab is held shut).
 */
import { motion, useAnimate, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buzz, HAPTIC, useSfx } from "@/audio";
import { LegalLinks } from "@/legal";
import { shell } from "@/lexicon/shell";
import { useShake } from "@/ui/motion/impact";
import { easeIn, easeOut, pressable, spring } from "@/ui/motion/presets";
import { Colophon } from "./Colophon";
import { useTapSounds } from "./juice";
import { TitleScene } from "./TitleScene";
import s from "./title.module.css";

const T = shell.title;

export function TitleScreen({
	ready,
	onEnter,
}: {
	ready: boolean;
	onEnter: () => void;
}) {
	const [scope, animate] = useAnimate<HTMLDivElement>();
	const shaker = useShake<HTMLDivElement>();
	const reduce = useReducedMotion();
	const [flare, setFlare] = useState(0);
	const [struck, setStruck] = useState(false);
	const [colophon, setColophon] = useState(false);
	// The bell is fetched right after the first touch (nothing loads before one).
	const sfx = useSfx(["toll"]);
	useTapSounds();

	// The name falls out of the dark and strikes; the glass flares with it.
	// biome-ignore lint/correctness/useExhaustiveDependencies: plays once on mount
	useEffect(() => {
		const root = scope.current;
		if (!root) return;
		const name = root.querySelector("[data-name]");
		if (!name) return;
		let dead = false;
		if (reduce) {
			animate(
				name,
				{ opacity: 1, scale: 1, filter: "blur(0px)" },
				{ duration: 0.3 },
			);
			setStruck(true);
			return;
		}
		(async () => {
			await animate(
				name,
				{
					opacity: [0, 1],
					scale: [1.9, 1],
					filter: ["blur(14px)", "blur(0px)"],
				},
				{ duration: 0.42, delay: 0.75, ease: easeIn },
			);
			if (dead) return;
			setFlare((n) => n + 1);
			setStruck(true);
			shaker.shake({ amp: 7, duration: 0.36, twist: 0.4 });
			await animate(
				name,
				{ scale: [0.95, 1] },
				{ ...spring.slam, velocity: 0 },
			);
		})().catch(() => {});
		return () => {
			dead = true;
		};
	}, []);

	return (
		<main className={s.title}>
			<div ref={shaker.ref} className={s.quake}>
				<TitleScene flare={flare} />
			</div>

			<div ref={scope} className={s.front}>
				<div className={s.pool} aria-hidden="true" />
				<h1 className={s.mark}>
					<span data-name className={s.name} style={{ opacity: 0 }}>
						<span className={s.nameInk} aria-hidden="true">
							{T.name}
						</span>
						<span className={s.nameFill}>{T.name}</span>
					</span>
					<motion.span
						className={s.sub}
						initial={{ opacity: 0, letterSpacing: "0.7em" }}
						animate={
							struck
								? { opacity: 1, letterSpacing: "0.3em" }
								: { opacity: 0, letterSpacing: "0.7em" }
						}
						transition={{ duration: 0.9, ease: easeOut }}
					>
						<motion.i
							className={s.rule}
							initial={{ scaleX: 0 }}
							animate={{ scaleX: struck ? 1 : 0 }}
							transition={{ duration: 0.7, ease: easeOut, delay: 0.1 }}
						/>
						<span>{T.sub}</span>
						<motion.i
							className={s.rule}
							initial={{ scaleX: 0 }}
							animate={{ scaleX: struck ? 1 : 0 }}
							transition={{ duration: 0.7, ease: easeOut, delay: 0.1 }}
						/>
					</motion.span>
				</h1>

				<motion.div
					className={s.ctaWrap}
					initial={{ opacity: 0, y: 18 }}
					animate={struck ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
					transition={{ ...spring.settle, delay: 0.55 }}
				>
					<motion.button
						type="button"
						className={s.cta}
						data-ready={ready || undefined}
						data-sfx="off"
						disabled={!ready}
						onClick={() => {
							// The first touch is this one: give the bell time to arrive.
							sfx.play("toll", { maxLate: 1500 });
							buzz(HAPTIC.seal);
							onEnter();
						}}
						{...pressable}
					>
						<span className={s.ctaLabel}>{ready ? T.enter : T.entering}</span>
					</motion.button>
				</motion.div>

				<motion.p
					className={s.consent}
					initial={{ opacity: 0 }}
					animate={{ opacity: struck ? 1 : 0 }}
					transition={{ duration: 0.6, delay: 0.7 }}
				>
					{T.consent.lead} <Link href="/terms">{T.consent.terms}</Link>{" "}
					{T.consent.and} <Link href="/privacy">{T.consent.privacy}</Link>.
				</motion.p>

				<motion.div
					className={s.foot}
					initial={{ opacity: 0 }}
					animate={{ opacity: struck ? 1 : 0 }}
					transition={{ duration: 0.6, delay: 0.9 }}
				>
					<LegalLinks className={s.footLegal ?? ""} />
					<span className={s.footDot} aria-hidden="true">
						·
					</span>
					<button
						type="button"
						className={s.colophonLink}
						onClick={() => setColophon(true)}
					>
						{shell.colophon.open}
					</button>
				</motion.div>
			</div>

			<Colophon open={colophon} onClose={() => setColophon(false)} />
		</main>
	);
}
