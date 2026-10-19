"use client";

/**
 * One-line toast just above the tab bar: "Spire opened", "Fight 3 duels". A new toast
 * replaces the old one; each lingers ~2.6s. Use useToast() for the show() handle and render
 * the returned node once.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { spring } from "@/ui/motion";
import s from "./toast.module.css";

export type ToastTone = "plain" | "lit";

interface Shown {
	id: number;
	text: string;
	tone: ToastTone;
}

export function useToast(
	ms = 2600,
): [ReactNode, (text: string, tone?: ToastTone) => void] {
	const [shown, setShown] = useState<Shown | null>(null);
	const reduce = useReducedMotion() ?? false;

	const show = useCallback((text: string, tone: ToastTone = "plain") => {
		setShown({ id: Date.now() + Math.random(), text, tone });
	}, []);

	useEffect(() => {
		if (!shown) return;
		const t = setTimeout(() => setShown(null), ms);
		return () => clearTimeout(t);
	}, [shown, ms]);

	const node = (
		<div className={s.dock} aria-live="polite">
			<AnimatePresence mode="popLayout">
				{shown ? (
					<motion.p
						key={shown.id}
						className={s.toast}
						data-tone={shown.tone}
						initial={
							reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }
						}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{
							opacity: 0,
							y: reduce ? 0 : 8,
							transition: { duration: 0.16 },
						}}
						transition={spring.settle}
					>
						{shown.text}
					</motion.p>
				) : null}
			</AnimatePresence>
		</div>
	);
	return [node, show];
}
