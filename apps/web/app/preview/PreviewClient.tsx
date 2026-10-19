"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { MockApiProvider, type MockState } from "@/client/mock";
import {
	resetMockEconomy,
	resetMockInventory,
	resetMockMarks,
	SPIRE_STATES,
} from "@/client/mock/index";
import {
	GATHERING_STATES,
	isGatheringState,
	isMeState,
	ME_STATES,
} from "@/client/mockData";
import { levelThreshold } from "@/game/economy";
import { L } from "@/lexicon";
import { FragmentScreen } from "@/screens/fragment/FragmentScreen";
import { GatheringScreen } from "@/screens/gathering/GatheringScreen";
import { ReliquaryScreen } from "@/screens/reliquary/ReliquaryScreen";
import { SpireScreen } from "@/screens/spire/SpireScreen";
import { GameShell } from "@/screens/title/Shell";
import { TitleScreen } from "@/screens/title/TitleScreen";
import { TUTORIAL_KEY, Tutorial } from "@/screens/tutorial/Tutorial";
import { VestryScreen } from "@/screens/vestry/VestryScreen";
import { GlassWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import { MotionRoot } from "@/ui/motion/MotionRoot";
import type { Tab } from "@/ui/TabBar";

type Opt = string | undefined;

const HOUR = 3_600_000;

/** Fragment tab HUD worlds (screen=hud): the bound Stage with standing, Vigil, Marks, push. */
const HUD_STATES = {
	mid: "Degree VI, level 12 of 15, 340 Ash, Vigil 7h waiting, Marks shelf, a title worn.",
	full: "Vigil full (12h): ember bar, Full tag, Collect.",
	empty: "Vigil just collected: nothing to collect yet.",
	capped: "Level 15 of 15: the capped note instead of the to-next count.",
	dressed: "Night pack worn: Ink finish, Night tint, the Long Night title.",
	new: "New Claimant: Degree VII level 1, no Ash, no Marks, no title.",
	"marks-new": "Same as mid, with every Mark unseen (medals pulse once).",
} as const;
const RELIQUARY_STATES = {
	mid: "340 Ash, 7 Scryings to the sure Relic, three recent results.",
	broke: "40 Ash: Scrying is out of reach.",
	pity: "One Scrying from the sure Relic.",
	rich: "5,000 Ash to pull with.",
} as const;
const VESTRY_STATES = {
	mid: "4 USDC: the Night and Oxblood packs are affordable, the Throne is not.",
	empty: "0 USDC on the account.",
	owned: "Every pack already owned.",
	rich: "20 USDC: everything affordable.",
} as const;
const TUTORIAL_STATES = {
	first: "The first-run guide over the Fragment tab (four steps, skippable).",
} as const;
const TITLE_STATES = {
	ready:
		"Title screen with the enter button live (tap the colophon link for credits).",
	waking: "Title screen while the doors are still opening (button disabled).",
} as const;
const MASK_STATES = {
	all: "All seven masks in their windows, with the picker-size and ledger-size masks.",
} as const;

const pick = <T extends object>(
	table: T,
	s: Opt,
	fallback: keyof T,
): keyof T => (s && s in table ? (s as keyof T) : fallback);

const ALL_PACK_ITEMS = [
	"title.quiet",
	"tint.bone",
	"title.unrepentant",
	"finish.ink",
	"tint.night",
	"title.longNight",
	"tint.oxblood",
	"title.redHand",
	"tint.gilt",
	"title.emptyThrone",
	"title.uncrowned",
];

/** Put every feature mock into the world this link asks for (before any screen fetches). */
function seedWorld(screen: Opt, state: Opt) {
	resetMockEconomy();
	resetMockInventory();
	resetMockMarks();
	const now = Date.now();
	if (screen === "hud") {
		const st = pick(HUD_STATES, state, "mid");
		if (st === "full") resetMockEconomy({ vigilSince: now - 14 * HOUR });
		if (st === "empty") resetMockEconomy({ vigilSince: now });
		if (st === "capped")
			resetMockEconomy({ resonance: levelThreshold(15) + 40 });
		if (st === "dressed")
			resetMockInventory({
				items: ["finish.ink", "tint.night", "title.longNight"],
				equipped: {
					finish: "finish.ink",
					tint: "tint.night",
					title: "title.longNight",
				},
			});
		if (st === "new") {
			resetMockEconomy({
				degree: 7,
				resonance: 0,
				ash: 0,
				vigilSince: now - 20 * 60_000,
			});
			resetMockMarks({ empty: true });
			resetMockInventory({
				items: [],
				equipped: { finish: null, tint: null, title: null },
				log: [],
				sinceRelic: 0,
			});
		}
		if (st === "marks-new")
			try {
				localStorage.removeItem("apostasy.marks.seen");
			} catch {}
	}
	if (screen === "reliquary") {
		const st = pick(RELIQUARY_STATES, state, "mid");
		if (st === "broke") resetMockEconomy({ ash: 40 });
		if (st === "pity") resetMockInventory({ sinceRelic: 19 });
		if (st === "rich") resetMockEconomy({ ash: 5000 });
	}
	if (screen === "vestry") {
		const st = pick(VESTRY_STATES, state, "mid");
		if (st === "empty") resetMockInventory({ usdc: 0 });
		if (st === "rich") resetMockInventory({ usdc: 20 });
		if (st === "owned") resetMockInventory({ items: ALL_PACK_ITEMS });
	}
}

/** Seeds the mock world once, before its children mount. */
function Seeded({
	screen,
	state,
	children,
}: {
	screen: Opt;
	state: Opt;
	children: ReactNode;
}) {
	useState(() => seedWorld(screen, state));
	return <>{children}</>;
}

const TABS: Record<string, Tab> = {
	fragment: "fragment",
	hud: "fragment",
	tutorial: "fragment",
	gathering: "gathering",
	spire: "spire",
	reliquary: "reliquary",
	vestry: "vestry",
};

export function PreviewClient(p: {
	screen: Opt;
	state: Opt;
	me: Opt;
	gathering: Opt;
	aspect: Opt;
	frame: Opt;
	op: Opt;
	delay: Opt;
}) {
	if (!p.screen) return <Index />;

	const aspect = clampAspect(p.aspect);
	const mock: MockState = {
		me:
			p.screen === "fragment" && p.state && isMeState(p.state)
				? p.state
				: p.me && isMeState(p.me)
					? p.me
					: "confirmed",
		gathering:
			p.screen === "gathering" && p.state && isGatheringState(p.state)
				? p.state
				: p.gathering && isGatheringState(p.gathering)
					? p.gathering
					: "commit",
		aspect,
		...(p.delay ? { opDelayMs: Number(p.delay) || 0 } : {}),
		opOutcome: p.op === "fail" || p.op === "error" ? p.op : "ok",
	};
	const key = JSON.stringify(p);

	if (p.screen === "title")
		return (
			<MotionRoot key={key}>
				<TitlePreview ready={p.state !== "waking"} />
			</MotionRoot>
		);
	if (p.screen === "masks") return <MaskSheet key={key} />;

	const tab: Tab = TABS[p.screen] ?? "fragment";

	return (
		<MotionRoot key={key}>
			<Seeded screen={p.screen} state={p.state}>
				<MockApiProvider state={mock}>
					{p.frame === "bare" ? (
						<main className="shell">
							<div className="shell-body">
								<Body tab={tab} />
							</div>
						</main>
					) : (
						<GameShell initialTab={tab} />
					)}
					{p.screen === "tutorial" ? <TutorialPreview /> : null}
				</MockApiProvider>
			</Seeded>
		</MotionRoot>
	);
}

function clampAspect(v: Opt) {
	const n = Number(v ?? 2);
	return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 2;
}

function Body({ tab }: { tab: Tab }) {
	switch (tab) {
		case "fragment":
			return <FragmentScreen />;
		case "gathering":
			return <GatheringScreen />;
		case "spire":
			return <SpireScreen />;
		case "reliquary":
			return <ReliquaryScreen />;
		case "vestry":
			return <VestryScreen />;
	}
}

/** The first-run guide, forced on (the real app shows it once: FirstRun / TUTORIAL_KEY). */
function TutorialPreview() {
	const [open, setOpen] = useState(true);
	return open ? (
		<Tutorial
			onDone={() => {
				try {
					localStorage.setItem(TUTORIAL_KEY, "1");
				} catch {}
				setOpen(false);
			}}
		/>
	) : null;
}

/** The real title screen; entering drops into the real shell with no Fragment bound. */
function TitlePreview({ ready }: { ready: boolean }) {
	const [entered, setEntered] = useState(false);
	if (entered)
		return (
			<MockApiProvider state={{ me: "none" }}>
				<GameShell initialTab="fragment" />
			</MockApiProvider>
		);
	return <TitleScreen ready={ready} onEnter={() => setEntered(true)} />;
}

function MaskSheet() {
	return (
		<main className="shell">
			<div className="shell-body">
				<section className="screen">
					{L.aspects.map((a, i) => (
						<div key={a.key} style={{ display: "grid", gap: 8 }}>
							<GlassWindow aspect={i} height={250}>
								<Mask aspect={i} width={110} />
							</GlassWindow>
							<h2 className="aspect-name">
								{a.name} <span className="aspect-mask">· {a.mask}</span>
							</h2>
							<div style={{ display: "flex", gap: 12, alignItems: "end" }}>
								<Mask aspect={i} width={56} />
								<Mask aspect={i} width={40} />
								<Mask aspect={i} width={36} />
							</div>
						</div>
					))}
				</section>
			</div>
		</main>
	);
}

// ---------- index ----------

const SCREENS: {
	screen: string;
	title: string;
	states: Record<string, string>;
}[] = [
	{ screen: "title", title: "Title", states: TITLE_STATES },
	{ screen: "fragment", title: "Fragment tab", states: ME_STATES },
	{ screen: "hud", title: "Fragment tab HUD", states: HUD_STATES },
	{ screen: "tutorial", title: "First-run guide", states: TUTORIAL_STATES },
	{ screen: "gathering", title: "Gathering tab", states: GATHERING_STATES },
	{ screen: "spire", title: "Spire tab", states: SPIRE_STATES },
	{ screen: "reliquary", title: "Reliquary tab", states: RELIQUARY_STATES },
	{ screen: "vestry", title: "Vestry tab", states: VESTRY_STATES },
	{ screen: "masks", title: "Mask sheet", states: MASK_STATES },
];

const box: CSSProperties = {
	padding: "20px 18px 40px",
	color: "var(--bone, #d8c6a0)",
	fontFamily: "var(--font-book)",
	fontSize: 14,
	lineHeight: 1.45,
	overflowY: "auto",
	height: "100dvh",
};
const link: CSSProperties = {
	color: "#e3c27c",
	display: "inline-block",
	minHeight: 28,
};

function Index() {
	return (
		<main style={box}>
			<h1 className="lettering" style={{ fontSize: 34, marginBottom: 4 }}>
				Preview
			</h1>
			<p style={{ opacity: 0.75, marginBottom: 16 }}>
				Dev-only. Fixture data, no sign-in. Screenshot at 390x844 (also 360x740
				and 430x932). Extra params: aspect=0..6, frame=bare, op=fail|error,
				delay=ms, me=…, gathering=…, outcome=win|lose (Spire), spire=… (the
				Spire world on other screens)
			</p>
			{SCREENS.map((s) => (
				<section key={s.screen} style={{ marginBottom: 18 }}>
					<h2 style={{ fontSize: 18, color: "#e3c27c", marginBottom: 6 }}>
						{s.title}
					</h2>
					<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
						{Object.entries(s.states).map(([state, what]) => {
							const href = `/preview?screen=${s.screen}&state=${state}`;
							return (
								<li key={state} style={{ marginBottom: 6 }}>
									<a href={href} style={link}>
										{state}
									</a>
									<span style={{ opacity: 0.7 }}> {what}</span>
								</li>
							);
						})}
						{s.screen === "fragment" && (
							<li style={{ marginBottom: 6 }}>
								<span style={{ opacity: 0.7 }}>Each Aspect bound: </span>
								{L.aspects.map((a, i) => (
									<a
										key={a.key}
										href={`/preview?screen=fragment&state=confirmed&aspect=${i}`}
										style={{ ...link, marginRight: 10 }}
									>
										{a.name}
									</a>
								))}
							</li>
						)}
					</ul>
				</section>
			))}
		</main>
	);
}
