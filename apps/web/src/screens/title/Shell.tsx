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
 *
 * Each way taken is a history entry (`?tab=spire`, pushed natively so the shell never remounts):
 * Back walks back through the ways, and Back on the first one leaves as usual. Closed ways are
 * never written. Sheets (useBackToClose) stack their own entry on top, so Back closes them first.
 * Tapping the way you stand on glides it to the top; each way's scroll is kept while away.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import {
	type ComponentType,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { HAPTIC, useSfx } from "@/audio";
import { UNLOCKS, type UnlockId, useGameState } from "@/client/state";
import { FxLayer } from "@/fx";
import { unlocks as U } from "@/lexicon/unlocks";
import { FragmentScreen } from "@/screens/fragment/FragmentScreen";
import { useToast } from "@/ui/coach/Toast";
import { easeIn, easeOut } from "@/ui/motion/presets";
import { TAB_ORDER, type Tab, TabBar } from "@/ui/TabBar";
import { gildOpening, useTapSounds } from "./juice";
import { Moments } from "./Moments";
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
/** The tab an opened mechanic lives on (its icon takes the gilt ring). */
const homeOf = (id: UnlockId): Tab =>
	TAB_ORDER.find((t) => t === id) ?? "fragment";
/** Opened things whose coach mark (onboarding/UnlockCoach) strikes its own unlock moment. */
const COACHED: ReadonlySet<UnlockId> = new Set([
	"vigil",
	"spire",
	"reliquary",
	"vestry",
]);

const isTab = (v: unknown): v is Tab => TAB_ORDER.some((t) => t === v);

/** The way a history entry stands for: its own mark, else its `?tab=`, else the Fragment. */
function tabOfEntry(): Tab {
	const st = window.history.state as { __tab?: unknown } | null;
	if (isTab(st?.__tab)) return st.__tab;
	const q = new URLSearchParams(window.location.search).get("tab");
	return isTab(q) ? q : "fragment";
}

/** Write the way into history: `?tab=` (the Fragment, the first way, needs none). */
function writeTab(t: Tab, how: "push" | "replace") {
	const u = new URL(window.location.href);
	if (t === "fragment") u.searchParams.delete("tab");
	else u.searchParams.set("tab", t);
	// No Next.js keys here: its patched pushState copies them over and syncs the router.
	const data = { __tab: t };
	const url = `${u.pathname}${u.search}${u.hash}`;
	if (how === "push") window.history.pushState(data, "", url);
	else window.history.replaceState(data, "", url);
}

const needOf = (id: UnlockId) => {
	const def = UNLOCKS.find((u) => u.id === id);
	// "Vestry · Scry once to open": the toast names what it opens and what to do.
	return def ? U.lockedToast(U.name[id], U.need[def.need]) : U.stillLocked;
};

export function GameShell({ initialTab = "fragment" }: { initialTab?: Tab }) {
	const [[tab, dir], setNav] = useState<[Tab, number]>([initialTab, 1]);
	const { state } = useGameState();
	const [toast, say] = useToast();
	const sfx = useSfx(["unlock"]);
	const reduce = useReducedMotion() ?? false;
	useTapSounds();
	const tabNow = useRef(tab);
	tabNow.current = tab;
	const unlocks = state?.unlocks ?? null;
	const fresh = state?.fresh;
	const done = state?.onboarding.done ?? true;

	// Each way's scroller, and where each was left (the ways unmount when left).
	const ways = useRef<Partial<Record<Tab, HTMLDivElement>>>({});
	const kept = useRef<Partial<Record<Tab, number>>>({});

	/** Move to another way; history is written by the caller (or was, for Back). */
	const move = useCallback((t: Tab, how: "push" | "replace" | "pop") => {
		const cur = tabNow.current;
		if (t === cur) return;
		const el = ways.current[cur];
		if (el) kept.current[cur] = el.scrollTop;
		// A sheet's entry on top (one that leaves the ledge in reach): the way replaces it, so
		// Back never lands on a sheet that is no longer there.
		const onSheet = !!(window.history.state as { __sheet?: string } | null)
			?.__sheet;
		if (how !== "pop") writeTab(t, how === "push" && onSheet ? "replace" : how);
		tabNow.current = t;
		setNav([t, Math.sign(TAB_ORDER.indexOf(t) - TAB_ORDER.indexOf(cur))]);
	}, []);

	const go = (t: Tab) => {
		if (t !== tabNow.current) return move(t, "push");
		// The way you stand on: back to its top.
		ways.current[t]?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
	};

	// This entry stands for the way opened on (a deep link's `?tab=` included); Back and Forward
	// move between the ways. A sheet's entry carries the same way, so closing one changes nothing.
	useEffect(() => {
		const st = (window.history.state ?? {}) as Record<string, unknown>;
		if (st.__tab !== tabNow.current)
			window.history.replaceState({ ...st, __tab: tabNow.current }, "");
		const onPop = () => move(tabOfEntry(), "pop");
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [move]);

	// Mounting a way: put it back where it was left. Its content may still be loading, so wait
	// (briefly) until it is tall enough, and give up the moment the player scrolls it themselves.
	// One stable ref per way (a fresh one each render would re-run this on every render).
	const refs = useRef(
		new Map<Tab, (el: HTMLDivElement | null) => () => void>(),
	);
	const wayRef = (t: Tab) => {
		let r = refs.current.get(t);
		if (!r) {
			r = (el) => {
				if (!el) return () => {};
				ways.current[t] = el;
				const want = kept.current[t] ?? 0;
				let raf = 0;
				const stop = () => {
					cancelAnimationFrame(raf);
					el.removeEventListener("pointerdown", stop);
					el.removeEventListener("wheel", stop);
				};
				if (want > 0) {
					let frames = 0;
					const step = () => {
						if (el.scrollHeight - el.clientHeight >= want || frames++ > 90) {
							el.scrollTop = want;
							return stop();
						}
						raf = requestAnimationFrame(step);
					};
					el.addEventListener("pointerdown", stop, { passive: true });
					el.addEventListener("wheel", stop, { passive: true });
					step();
				}
				return () => {
					stop();
					if (ways.current[t] === el) delete ways.current[t];
				};
			};
			refs.current.set(t, r);
		}
		return r;
	};

	// Closed ways (none shown until the state is known, so returning players never see locks flash).
	const locked: Partial<Record<Tab, boolean>> = {};
	const lit: Partial<Record<Tab, boolean>> = {};
	for (const t of TAB_IDS) {
		locked[t] = !!unlocks && !unlocks[t];
		lit[t] = !!fresh?.includes(t);
	}

	// Opened while away from it (or a closed way from a notification link): back to the Fragment.
	// Replaced, not pushed: a closed way never stays in history.
	useEffect(() => {
		if (unlocks && tab !== "fragment" && !unlocks[tab])
			move("fragment", "replace");
	}, [unlocks, tab, move]);

	// The unlock moment: name what just opened, once per sitting. While onboarding runs only
	// the Gathering is announced; the rest are met through their coach marks afterwards.
	const announced = useRef(new Set<UnlockId>());
	useEffect(() => {
		if (!fresh) return;
		const news = fresh.filter((id) => !announced.current.has(id));
		for (const id of news) announced.current.add(id);
		const say1 = done ? news : news.filter((id) => id === "gathering");
		if (!say1.length) return;
		say(U.openedLine(say1.map((id) => U.name[id]).join(", ")), "lit");
		// The moment itself: a bright chime and a gilt ring on each opened way's icon. Not while
		// onboarding runs (its Gathering mark arrives as an unlock), nor for something whose
		// coach mark is about to point at it on this very tab (that mark rings instead).
		if (!done) return;
		const loud = say1.filter(
			(id) => !(COACHED.has(id) && homeOf(id) === tabNow.current),
		);
		if (!loud.length) return;
		sfx.play("unlock");
		sfx.buzz(HAPTIC.unlock);
		const homes = new Set(loud.map(homeOf));
		let i = 0;
		for (const t of homes)
			gildOpening(
				document.querySelector(`[data-coach="tab-${t}"]`),
				0.12 * i++,
			);
	}, [fresh, done, say, sfx]);

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
						ref={wayRef(tab)}
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
			<Moments />
			<FxLayer />
		</main>
	);
}
