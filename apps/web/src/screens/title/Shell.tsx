"use client";

/**
 * The signed-in shell: the current way fills the screen, the carved ledge sits
 * at its foot. Ways slide in from the side they lie on and the last one falls
 * away. Exported so the preview harness renders the real thing.
 */
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { FragmentScreen } from "@/screens/fragment/FragmentScreen";
import { GatheringScreen } from "@/screens/gathering/GatheringScreen";
import { Sealed } from "@/screens/sealed/Sealed";
import { easeIn, easeOut } from "@/ui/motion/presets";
import { TAB_ORDER, type Tab, TabBar } from "@/ui/TabBar";
import s from "./shell.module.css";

const swap = {
	hidden: (dir: number) => ({ opacity: 0, x: `${8 * dir}%`, scale: 0.985 }),
	shown: {
		opacity: 1,
		x: "0%",
		scale: 1,
		transition: { duration: 0.32, ease: easeOut },
	},
	gone: (dir: number) => ({
		opacity: 0,
		x: `${-5 * dir}%`,
		scale: 0.99,
		transition: { duration: 0.16, ease: easeIn },
	}),
};

function Way({ tab }: { tab: Tab }) {
	switch (tab) {
		case "fragment":
			return <FragmentScreen />;
		case "gathering":
			return <GatheringScreen />;
		default:
			return <Sealed which={tab} />;
	}
}

export function GameShell({ initialTab = "fragment" }: { initialTab?: Tab }) {
	const [[tab, dir], setNav] = useState<[Tab, number]>([initialTab, 1]);
	const go = (t: Tab) =>
		setNav(([cur]) =>
			t === cur
				? [cur, 0]
				: [t, Math.sign(TAB_ORDER.indexOf(t) - TAB_ORDER.indexOf(cur))],
		);

	return (
		<main className={s.shell}>
			<div className={s.body}>
				<AnimatePresence initial={false} custom={dir}>
					<motion.div
						key={tab}
						className={s.way}
						custom={dir}
						variants={swap}
						initial="hidden"
						animate="shown"
						exit="gone"
					>
						<Way tab={tab} />
					</motion.div>
				</AnimatePresence>
			</div>
			<TabBar tab={tab} onTab={go} />
		</main>
	);
}
