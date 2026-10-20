"use client";

// Dev-only bench for src/fx. Labels here are debug text, not game copy.

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { FX, FxLayer, fx, PALETTES } from "@/fx";

type Refs = {
	card: HTMLDivElement | null;
	light: HTMLDivElement | null;
	ash: HTMLDivElement | null;
	pot: HTMLDivElement | null;
};

type Effect = { id: string; label: string; run: (r: Refs) => void };

const EFFECTS: Effect[] = [
	{
		id: "embers",
		label: "embers",
		run: (r) => r.card && fx.burst("embers", r.card),
	},
	{
		id: "shards",
		label: "shards (glass)",
		run: (r) => r.card && fx.burst("shards", r.card),
	},
	{
		id: "devour",
		label: "devour",
		run: (r) => {
			if (!r.card) return;
			fx.burst("shards", r.card, { palette: PALETTES.devour, amount: 1.4 });
			fx.ring(r.card, FX.blood, { radius: 150, width: 8 });
		},
	},
	{
		id: "kindle",
		label: "kindle",
		run: (r) => r.card && fx.burst("kindle", r.card),
	},
	{
		id: "common",
		label: "sparkle common",
		run: (r) => r.card && fx.burst("sparkle", r.card, { rarity: "common" }),
	},
	{
		id: "rare",
		label: "sparkle rare",
		run: (r) => r.card && fx.burst("sparkle", r.card, { rarity: "rare" }),
	},
	{
		id: "relic",
		label: "sparkle relic",
		run: (r) => r.card && fx.burst("sparkle", r.card, { rarity: "relic" }),
	},
	{ id: "ash", label: "ash", run: (r) => r.card && fx.burst("ash", r.card) },
	{
		id: "unlock",
		label: "unlock",
		run: (r) => r.card && fx.burst("unlock", r.card),
	},
	{ id: "ring", label: "ring", run: (r) => r.card && fx.ring(r.card, FX.gilt) },
];

const btn: CSSProperties = {
	minHeight: 44,
	padding: "8px 10px",
	background: "#120c0a",
	color: "#e9dcbc",
	border: "1px solid #9a7a35",
	borderRadius: 2,
	font: "inherit",
	fontSize: 14,
	cursor: "pointer",
};

const counter: CSSProperties = {
	padding: "6px 12px",
	border: "1px solid #3a2c22",
	background: "#0b0807",
	minWidth: 90,
	textAlign: "center",
	fontVariantNumeric: "tabular-nums",
};

export function FxDemoClient({ loop }: { loop: string | null }) {
	const refs = useRef<Refs>({ card: null, light: null, ash: null, pot: null });
	const [light, setLight] = useState(0);
	const [ash, setAsh] = useState(0);
	const [live, setLive] = useState(0);
	const [enabled, setEnabled] = useState(true);

	// Live count + enabled flag, polled slowly (cheap, dev only).
	useEffect(() => {
		const id = window.setInterval(() => {
			setLive(fx.live);
			setEnabled(fx.enabled);
		}, 250);
		return () => window.clearInterval(id);
	}, []);

	const streamLight = () => {
		const r = refs.current;
		if (!r.pot || !r.light) return;
		void fx.flyTo(r.pot, r.light, {
			icon: "light",
			count: 12,
			onArrive: () => setLight((n) => n + 1),
		});
	};
	const streamAsh = () => {
		const r = refs.current;
		if (!r.pot || !r.ash) return;
		void fx.flyTo(r.pot, r.ash, {
			icon: "ash",
			count: 8,
			onArrive: () => setAsh((n) => n + 1),
		});
	};
	const stress = () => {
		const r = refs.current;
		for (const e of EFFECTS) e.run(r);
		streamLight();
		streamAsh();
	};

	// ?loop=<id> (an effect id, "light", "ash" or "all") for screenshots.
	// biome-ignore lint/correctness/useExhaustiveDependencies: fire helpers are stable enough for a dev bench
	useEffect(() => {
		if (!loop) return;
		const fire = () => {
			if (loop === "light") streamLight();
			else if (loop === "ash") streamAsh();
			else if (loop === "all") stress();
			else EFFECTS.find((e) => e.id === loop)?.run(refs.current);
		};
		const first = window.setTimeout(fire, 300);
		const id = window.setInterval(fire, 1200);
		return () => {
			window.clearTimeout(first);
			window.clearInterval(id);
		};
	}, [loop]);

	return (
		<main
			style={{
				minHeight: "100dvh",
				background: "#050403",
				color: "#e9dcbc",
				padding: 16,
				display: "flex",
				flexDirection: "column",
				gap: 16,
				fontFamily: "system-ui, sans-serif",
			}}
		>
			<FxLayer />
			<div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
				<div
					ref={(el) => {
						refs.current.light = el;
					}}
					style={{ ...counter, color: FX.gilt }}
				>
					Light {light}
				</div>
				<div style={{ fontSize: 12, opacity: 0.7, alignSelf: "center" }}>
					live {live} {enabled ? "" : "(off)"}
				</div>
				<div
					ref={(el) => {
						refs.current.ash = el;
					}}
					style={{ ...counter, color: FX.ashL }}
				>
					Ash {ash}
				</div>
			</div>

			<div
				style={{
					flex: 1,
					minHeight: 280,
					display: "grid",
					placeItems: "center",
					position: "relative",
				}}
			>
				<div
					ref={(el) => {
						refs.current.card = el;
					}}
					style={{
						width: 140,
						height: 190,
						background:
							"linear-gradient(160deg, #1a2a44, #0f1c2a 60%, #1d3a2e)",
						border: "2px solid #c9a24f",
						boxShadow: "0 10px 24px #000a",
					}}
				/>
				<div
					ref={(el) => {
						refs.current.pot = el;
					}}
					style={{
						position: "absolute",
						bottom: 0,
						left: "50%",
						width: 48,
						height: 20,
						marginLeft: -24,
						borderRadius: "50%",
						background: "radial-gradient(#f0cf7a88, #f0cf7a00 70%)",
					}}
				/>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
					gap: 8,
				}}
			>
				{EFFECTS.map((e) => (
					<button
						key={e.id}
						type="button"
						style={btn}
						onClick={() => e.run(refs.current)}
					>
						{e.label}
					</button>
				))}
				<button type="button" style={btn} onClick={streamLight}>
					light → counter
				</button>
				<button type="button" style={btn} onClick={streamAsh}>
					ash → counter
				</button>
				<button type="button" style={btn} onClick={stress}>
					everything
				</button>
				<button type="button" style={btn} onClick={() => fx.clear()}>
					clear
				</button>
			</div>
		</main>
	);
}
