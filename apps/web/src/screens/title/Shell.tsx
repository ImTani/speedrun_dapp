"use client";

/**
 * The signed-in shell: the current way fills the screen, the carved ledge sits
 * at its foot. Ways slide in from the side they lie on and the last one falls
 * away. Exported so the preview harness renders the real thing.
 *
 * Mechanics open one by one (shared game state): closed ways show a lock and say
 * what opens them; a way that just opened glows and a short toast names it. Only
 * the Fragment tab ships with the first paint; the other ways (and the onboarding
 * guide) load on demand, and the open ones are fetched quietly once the page idles.
 * Must sit inside <GameStateProvider>.
 */
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { type ComponentType, useEffect, useRef, useState } from "react";
import { UNLOCKS, type UnlockId, useGameState } from "@/client/state";
import { unlocks as U } from "@/lexicon/unlocks";
import { FragmentScreen } from "@/screens/fragment/FragmentScreen";
import { useToast } from "@/ui/coach/Toast";
import { easeIn, easeOut } from "@/ui/motion/presets";
import { TAB_ORDER, type Tab, TabBar } from "@/ui/TabBar";
import s from "./shell.module.css";

// Loaders kept apart from dynamic() so they can also be warmed ahead of the first tap.
const load = {
	spire: () => import("@/screens/spire/SpireScreen").then((m) => m.SpireScreen),
	gathering: () =>
		import("@/screens/gathering/GatheringScreen").then(
			(m) => m.GatheringScreen,
		),
	reliquary: () =>
		import("@/screens/reliquary/ReliquaryScreen").then(
			(m) => m.ReliquaryScreen,
		),
	vestry: () =>
		import("@/screens/vestry/VestryScreen").then((m) => m.VestryScreen),
} satisfies Record<Exclude<Tab, "fragment">, () => Promise<ComponentType>>;

const Pending = () => <section className="screen" aria-busy="true" />;
// WebGL and browser-only work: never rendered on the server.
const SpireScreen = dynamic(load.spire, { ssr: false, loading: Pending });
const GatheringScreen = dynamic(load.gathering, {
	ssr: false,
	loading: Pending,
});
const ReliquaryScreen = dynamic(load.reliquary, {
	ssr: false,
	loading: Pending,
});
const VestryScreen = dynamic(load.vestry, { ssr: false, loading: Pending });
const Guide = dynamic(
	() => import("@/screens/onboarding/Guide").then((m) => m.Guide),
	{ ssr: false },
);

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
		case "spire":
			return <SpireScreen />;
		case "gathering":
			return <GatheringScreen />;
		case "reliquary":
			return <ReliquaryScreen />;
		case "vestry":
			return <VestryScreen />;
	}
}

const TAB_IDS = TAB_ORDER.filter(
	(t): t is Exclude<Tab, "fragment"> => t !== "fragment",
);
const needOf = (id: UnlockId) => {
	const def = UNLOCKS.find((u) => u.id === id);
	// "Vestry · Scry once to open": the toast names what it opens and what to do.
	return def ? U.lockedToast(U.name[id], U.need[def.need]) : U.stillLocked;
};

export function GameShell({ initialTab = "fragment" }: { initialTab?: Tab }) {
	const [[tab, dir], setNav] = useState<[Tab, number]>([initialTab, 1]);
	const go = (t: Tab) =>
		setNav(([cur]) =>
			t === cur
				? [cur, 0]
				: [t, Math.sign(TAB_ORDER.indexOf(t) - TAB_ORDER.indexOf(cur))],
		);
	const { state } = useGameState();
	const [toast, say] = useToast();
	const unlocks = state?.unlocks ?? null;
	const fresh = state?.fresh;
	const done = state?.onboarding.done ?? true;

	// Closed ways (none shown until the state is known, so returning players never see locks flash).
	const locked: Partial<Record<Tab, boolean>> = {};
	const lit: Partial<Record<Tab, boolean>> = {};
	for (const t of TAB_IDS) {
		locked[t] = !!unlocks && !unlocks[t];
		lit[t] = !!fresh?.includes(t);
	}

	// Opened while away from it (or a closed way from a notification link): back to the Fragment.
	useEffect(() => {
		if (unlocks && tab !== "fragment" && !unlocks[tab])
			setNav(["fragment", -1]);
	}, [unlocks, tab]);

	// The unlock moment: name what just opened, once per sitting. While onboarding runs only
	// the Gathering is announced; the rest are met through their coach marks afterwards.
	const announced = useRef(new Set<UnlockId>());
	useEffect(() => {
		if (!fresh) return;
		const news = fresh.filter((id) => !announced.current.has(id));
		for (const id of news) announced.current.add(id);
		const say1 = done ? news : news.filter((id) => id === "gathering");
		if (say1.length)
			say(U.openedLine(say1.map((id) => U.name[id]).join(", ")), "lit");
	}, [fresh, done, say]);

	// Warm the open ways once the page is idle, so the first tap does not wait on the network.
	const warm = useRef(new Set<string>());
	useEffect(() => {
		if (!unlocks) return;
		const todo = TAB_IDS.filter((t) => unlocks[t] && !warm.current.has(t));
		if (!todo.length) return;
		const run = () => {
			for (const t of todo) {
				warm.current.add(t);
				void load[t]().catch(() => warm.current.delete(t));
			}
		};
		const w = window as Window & {
			requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
			cancelIdleCallback?: (id: number) => void;
		};
		if (w.requestIdleCallback) {
			const id = w.requestIdleCallback(run, { timeout: 4000 });
			return () => w.cancelIdleCallback?.(id);
		}
		const t = setTimeout(run, 1500);
		return () => clearTimeout(t);
	}, [unlocks]);

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
			<TabBar
				tab={tab}
				onTab={go}
				locked={locked}
				lit={lit}
				onLocked={(t) => say(needOf(t))}
			/>
			{toast}
			{state ? <Guide tab={tab} /> : null}
		</main>
	);
}
