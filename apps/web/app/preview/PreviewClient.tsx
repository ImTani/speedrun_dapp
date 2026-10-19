"use client";

import { type CSSProperties, useState } from "react";
import { MockApiProvider, type MockState } from "@/client/mock";
import {
	GATHERING_STATES,
	isGatheringState,
	isMeState,
	ME_STATES,
} from "@/client/mockData";
import { L } from "@/lexicon";
import { FragmentScreen } from "@/screens/fragment/FragmentScreen";
import { GatheringScreen } from "@/screens/gathering/GatheringScreen";
import { Sealed } from "@/screens/sealed/Sealed";
import { GameShell } from "@/screens/title/Shell";
import { TitleScreen } from "@/screens/title/TitleScreen";
import { GlassWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import { MotionRoot } from "@/ui/motion/MotionRoot";
import type { Tab } from "@/ui/TabBar";

type Opt = string | undefined;
type SealedWhich = "spire" | "reliquary" | "vestry";

const SEALED_STATES: Record<SealedWhich, string> = {
	spire: "The Spire, sealed for now.",
	reliquary: "The Reliquary, sealed for now.",
	vestry: "The Vestry, sealed for now.",
};
const TITLE_STATES = {
	ready:
		"Title screen with the enter button live (tap the colophon link for credits).",
	waking: "Title screen while the doors are still opening (button disabled).",
} as const;
const MASK_STATES = {
	all: "All seven masks in their windows, with the picker-size and ledger-size masks.",
} as const;

const isSealed = (s: Opt): s is SealedWhich => !!s && s in SEALED_STATES;

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

	const tab: Tab =
		p.screen === "gathering"
			? "gathering"
			: p.screen === "sealed"
				? isSealed(p.state)
					? p.state
					: "spire"
				: "fragment";

	return (
		<MotionRoot key={key}>
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
			</MockApiProvider>
		</MotionRoot>
	);
}

function clampAspect(v: Opt) {
	const n = Number(v ?? 2);
	return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 2;
}

function Body({ tab }: { tab: Tab }) {
	if (tab === "fragment") return <FragmentScreen />;
	if (tab === "gathering") return <GatheringScreen />;
	return <Sealed which={tab} />;
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
	{ screen: "gathering", title: "Gathering tab", states: GATHERING_STATES },
	{ screen: "sealed", title: "Sealed tabs", states: SEALED_STATES },
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
				delay=ms, me=…, gathering=…
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
