"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { L } from "@/lexicon";
import { FragmentScreen } from "@/screens/fragment/FragmentScreen";
import { GatheringScreen } from "@/screens/gathering/GatheringScreen";
import { Sealed } from "@/screens/sealed/Sealed";
import { type Tab, TabBar } from "@/ui/TabBar";

const PETALS = Array.from({ length: 12 }, (_, i) => i * 30);

export default function Home() {
	const { ready, authenticated, login } = usePrivy();
	const [tab, setTab] = useState<Tab>("fragment");

	if (!ready || !authenticated) {
		return (
			<main className="title-screen">
				<svg className="title-rose" viewBox="0 0 200 200" aria-hidden="true">
					{PETALS.map((deg, i) => (
						<path
							key={deg}
							d="M100 100 L92 20 Q100 8 108 20Z"
							transform={`rotate(${deg} 100 100)`}
							fill={
								i % 3 === 0 ? "#8e1218" : i % 3 === 1 ? "#e8c46a" : "#2c5fa8"
							}
							stroke="#0b0807"
							strokeWidth="3"
						/>
					))}
					<circle cx="100" cy="100" r="22" fill="#0b0807" />
					<circle
						cx="100"
						cy="100"
						r="88"
						fill="none"
						stroke="#0b0807"
						strokeWidth="6"
					/>
				</svg>
				<h1 className="lettering title-name">{L.title}</h1>
				<p className="title-sub">{L.subtitle}</p>
				<p className="prose title-tag">{L.tagline}</p>
				<button
					type="button"
					className="btn btn-blood"
					disabled={!ready}
					onClick={() => login()}
				>
					{ready ? L.enter : L.entering}
				</button>
			</main>
		);
	}

	return (
		<main className="shell">
			<div className="shell-body">
				{tab === "fragment" && <FragmentScreen />}
				{tab === "gathering" && <GatheringScreen />}
				{tab === "spire" && <Sealed which="spire" />}
				{tab === "reliquary" && <Sealed which="reliquary" />}
				{tab === "vestry" && <Sealed which="vestry" />}
			</div>
			<TabBar tab={tab} onTab={setTab} />
		</main>
	);
}
