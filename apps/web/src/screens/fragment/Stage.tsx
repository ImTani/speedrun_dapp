"use client";

/**
 * The Stage: the bound Fragment as a lit window. Its light pools on the stone
 * below; drag across the glass to move the light. Name plate, Light, the
 * Sigils it was cut with, and the chisel to re-carve them (chained while a
 * Gathering is under way). The HUD (./Hud.tsx) adds standing, the Vigil, Marks and
 * notifications. The Vigil, Retune and the Marks shelf stay hidden until they open
 * (shared game state); the first time each shows, it rises in with a glow.
 */
import { encodeConfig, type Knobs, type StrategyId } from "@arena/strategies";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buzz, HAPTIC, SoundSettingsList, SoundToggle, useSfx } from "@/audio";
import type { FragmentRow, StandingRow } from "@/client/api";
import { type UnlockId, useGameState } from "@/client/state";
import { FX, fx } from "@/fx";
import { cosmeticOf } from "@/game/reliquary";
import { L } from "@/lexicon";
import { hud as hudText } from "@/lexicon/hud";
import { titleText } from "@/lexicon/reliquary";
import { Atmosphere } from "@/scene/AtmosphereLayer";
import { DressedMask } from "@/screens/reliquary/ItemSwatch";
import { SettingsEntry } from "@/screens/title/SettingsEntry";
import { GlassWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import {
	enter,
	IMPACT,
	impact,
	pressable,
	rise,
	scrim,
	sheet,
	spring,
	useShake,
} from "@/ui/motion";
import { Count, Plate, Rubric, Slam } from "@/ui/type";
import { useBackToClose } from "@/ui/useBackToClose";
import s from "./fragment.module.css";
import { MarksShelf, PushToggle, StandingCard, useHud, VigilCard } from "./Hud";
import h from "./hud.module.css";
import { SigilEditor, sigilValue } from "./SigilEditor";
import { type Api, aspectOf, sigilsFor } from "./shared";

export function Stage({
	api,
	fragment,
	boutActive,
	fresh,
	onDone,
}: {
	api: Api;
	fragment: FragmentRow;
	boutActive: boolean;
	/** Just bound in this sitting: strike the "Bound" lettering once. */
	fresh: boolean;
	onDone: () => void;
}) {
	const { aspect, knobs } = aspectOf(fragment);
	const a = L.aspects[aspect] ?? L.aspects[0];
	const keys = sigilsFor(aspect);
	const [row, setRow] = useState<StandingRow | null>(null);
	const [swell, setSwell] = useState(0);
	const [editing, setEditing] = useState(false);
	const [note, setNote] = useState<string | null>(null);
	const [slam, setSlam] = useState(fresh);
	const [glassIn, setGlassIn] = useState(false);
	const floor = useRef<HTMLCanvasElement>(null);
	const glass = useRef<HTMLDivElement>(null);
	const shaker = useShake<HTMLDivElement>();
	const sfx = useSfx(fresh ? ["unlock"] : undefined);
	const hud = useHud(api);
	const { state } = useGameState();
	const open = (id: UnlockId) => state?.unlocks[id] ?? false;
	const isNew = (id: UnlockId) => state?.fresh.includes(id) ?? false;
	const equipped = hud.inv?.equipped ?? null;
	const title = titleText(cosmeticOf(equipped).title);

	useEffect(() => {
		const agent = fragment.agent?.toLowerCase();
		const load = () =>
			api
				.standings()
				.then((r) =>
					setRow(r.rows.find((x) => x.agent.toLowerCase() === agent) ?? null),
				)
				.catch(() => {});
		load();
		// Light and duels: every 15 s, only while the page is in view.
		const t = setInterval(() => {
			if (!document.hidden) load();
		}, 15000);
		return () => clearInterval(t);
	}, [api, fragment.agent]);

	useEffect(() => {
		if (!note) return;
		const t = setTimeout(() => setNote(null), 4200);
		return () => clearTimeout(t);
	}, [note]);

	const light = row?.light ?? 0;

	return (
		<div className={s.stage}>
			<canvas ref={floor} className={s.floor} />
			{/* Post-processing over the floor light, under the window and every word (both are in
			    later, higher layers): the window's halo, spill and dust reach the stone around it. */}
			<Atmosphere
				floor="auto"
				lean={0}
				rise={0.6}
				opaque={false}
				style={{
					inset: "0 calc(var(--pad-r) * -1) 0 calc(var(--pad-l) * -1)",
				}}
			/>
			<div className={s.stageTop} ref={shaker.ref}>
				<div className={s.soundCorner}>
					<SettingsEntry />
					<SoundToggle />
				</div>
				<div className={s.windowWrap} ref={glass}>
					<GlassWindow
						aspect={aspect}
						mood="lit"
						caustics={floor}
						swell={swell}
						onReady={() => setGlassIn(true)}
					/>
				</div>
				<AnimatePresence>
					{slam && glassIn ? (
						<motion.div
							key="slam"
							className={s.boundSlam}
							exit={{ opacity: 0, transition: { duration: 0.5 } }}
						>
							<Slam
								text={L.status.confirmed}
								sub={L.status.boundLine}
								tone="kindle"
								delay={0.55}
								onImpact={() => {
									setSwell((n) => n + 1);
									impact(shaker, { ...IMPACT.kindle, buzz: false });
									// Bound: the window takes the light.
									sfx.play("unlock");
									sfx.buzz(HAPTIC.unlock);
									const w = glass.current;
									if (w) {
										fx.burst("kindle", w, { amount: 0.8 });
										fx.ring(w, FX.gilt, { radius: 150, width: 7 });
									}
								}}
								onDone={() => setTimeout(() => setSlam(false), 1600)}
							/>
						</motion.div>
					) : null}
				</AnimatePresence>
			</div>

			<motion.div className={s.stageBody} {...enter(rise)}>
				<Plate
					name={fragment.name}
					epithet={a.name}
					emblem={
						equipped ? (
							<DressedMask aspect={aspect} equipped={equipped} size={44} glow />
						) : (
							<Mask aspect={aspect} size={44} glow />
						)
					}
					size="lg"
					className={s.stagePlate ?? ""}
				/>
				{title ? <p className={h.title}>{title}</p> : null}
				<div className={s.temperBlock}>
					<p className={s.temperament}>{a.blurb}</p>
				</div>

				<div className={s.tallies}>
					<div className={s.tally} data-main="1">
						{row ? (
							<Count
								value={light}
								tone={light < 0 ? "blood" : "gilt"}
								size="xl"
							/>
						) : (
							<span className={s.tallyEmpty}>·</span>
						)}
						<Rubric size="xs" tone="dim">
							{L.hero.light}
						</Rubric>
					</div>
					<div className={s.tally}>
						{row ? (
							<Count value={row.duels} tone="bone" size="lg" />
						) : (
							<span className={s.tallyEmpty}>·</span>
						)}
						<Rubric size="xs" tone="dim">
							{L.hero.duels}
						</Rubric>
					</div>
				</div>

				{hud.profile ? (
					<>
						<StandingCard profile={hud.profile} />
						{open("vigil") ? (
							<Reveal fresh={isNew("vigil")} coach="vigil">
								<VigilCard
									api={api}
									profile={hud.profile}
									onClaimed={hud.setProfile}
								/>
							</Reveal>
						) : null}
					</>
				) : hud.profileDown ? (
					<p className={h.note}>{hudText.standingDown}</p>
				) : null}

				<section className={s.sigilSummary}>
					<Rubric as="h3" rule="both">
						{L.hero.sigils}
					</Rubric>
					{keys.length === 0 ? (
						<p className={s.hint}>{L.hero.noSigils}</p>
					) : (
						<ul className={s.tiles}>
							{keys.map((k) => (
								<li key={k} className={s.tile}>
									<span className={s.tileName}>{L.sigils[k].name}</span>
									<span className={s.tileVal}>{sigilValue(k, knobs[k])}</span>
								</li>
							))}
						</ul>
					)}
				</section>

				{keys.length > 0 && open("retune") ? (
					boutActive ? (
						<div className={s.locked}>
							<Chain />
							<div>
								<p className={s.lockedHead}>{L.hero.retuneLockedHead}</p>
								<p className={s.hint}>{L.hero.retuneLocked}</p>
							</div>
						</div>
					) : (
						<Reveal fresh={isNew("retune")}>
							<motion.button
								type="button"
								className={`btn btn-ghost ${s.chisel}`}
								data-coach="retune"
								onClick={() => {
									buzz(HAPTIC.tap);
									setEditing(true);
								}}
								{...pressable}
							>
								{L.hero.retune}
							</motion.button>
						</Reveal>
					)
				) : null}
				<AnimatePresence>
					{note ? (
						<motion.p
							key={note}
							className="banner"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
						>
							{note}
						</motion.p>
					) : null}
				</AnimatePresence>
				{hud.marks && open("marks") ? (
					<Reveal fresh={isNew("marks")} coach="marks">
						<MarksShelf res={hud.marks} />
					</Reveal>
				) : null}
				<PushToggle api={api} />
				<SoundSettingsList className={s.soundList ?? ""} />
			</motion.div>

			{typeof document !== "undefined"
				? createPortal(
						<AnimatePresence>
							{editing && !boutActive ? (
								<RetuneSheet
									key="retune"
									api={api}
									aspect={aspect}
									knobs={knobs}
									onClose={() => setEditing(false)}
									onCarved={(ok) => {
										setNote(ok ? L.hero.retuneDone : L.hero.retuneFailed);
										if (ok) {
											setEditing(false);
											setSwell((n) => n + 1);
										}
										onDone();
									}}
								/>
							) : null}
						</AnimatePresence>,
						document.body,
					)
				: null}
		</div>
	);
}

/**
 * Something that just opened: it rises in late with a brief candle ring the first time it
 * shows. Already-known things render plainly.
 */
function Reveal({
	fresh,
	coach,
	children,
}: {
	fresh: boolean;
	coach?: string;
	children: ReactNode;
}) {
	const reduce = useReducedMotion() ?? false;
	// Only the first render decides: the ring plays once even after it is acknowledged.
	const [first] = useState(fresh);
	if (!first)
		return (
			<div className={s.reveal} data-coach={coach}>
				{children}
			</div>
		);
	return (
		<motion.div
			className={s.reveal}
			data-coach={coach}
			data-fresh="1"
			initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{
				...spring.settle,
				delay: 0.35,
				opacity: { duration: 0.3, delay: 0.35 },
			}}
		>
			{children}
		</motion.div>
	);
}

function RetuneSheet({
	api,
	aspect,
	knobs,
	onClose,
	onCarved,
}: {
	api: Api;
	aspect: number;
	knobs: Knobs;
	onClose: () => void;
	onCarved: (ok: boolean) => void;
}) {
	const [draft, setDraft] = useState<Knobs>(knobs);
	const [busy, setBusy] = useState(false);
	const changed = (Object.keys(knobs) as (keyof Knobs)[]).some(
		(k) => knobs[k] !== draft[k],
	);
	// Back (Android) and Escape close it, as the scrim does; not while the carving is in flight.
	const dismiss = () => {
		if (!busy) onClose();
	};
	useBackToClose(true, dismiss);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !busy) onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [busy, onClose]);

	const carve = async () => {
		setBusy(true);
		try {
			const config = encodeConfig({
				strategy: aspect as StrategyId,
				knobs: draft,
			}).toString();
			const ok = await api.runPlayerOp({ action: "retune", config });
			onCarved(ok);
		} catch {
			onCarved(false);
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<motion.div
				className={s.scrim}
				{...enter(scrim)}
				onClick={dismiss}
				aria-hidden="true"
			/>
			<motion.div
				className={s.sheet}
				role="dialog"
				aria-modal="true"
				aria-labelledby="retune-head"
				{...enter(sheet)}
			>
				<span className={s.sheetGrip} aria-hidden="true" />
				<div className={s.sheetHead}>
					<Mask aspect={aspect} size={48} glow />
					<div>
						<h2 className={s.h2} id="retune-head">
							{L.hero.retuneHeading}
						</h2>
						<p className={s.hint}>{L.hero.retuneHint}</p>
					</div>
				</div>
				<div className={s.sheetBody}>
					<SigilEditor
						aspect={aspect}
						knobs={draft}
						onChange={setDraft}
						disabled={busy}
					/>
				</div>
				<div className={s.sheetFoot}>
					<motion.button
						type="button"
						className="btn btn-ghost"
						disabled={busy}
						onClick={onClose}
						{...pressable}
					>
						{L.hero.cancel}
					</motion.button>
					<motion.button
						type="button"
						className="btn btn-blood"
						disabled={busy || !changed}
						onClick={carve}
						{...pressable}
					>
						{busy ? L.hero.retuning : L.hero.retuneApply}
					</motion.button>
				</div>
			</motion.div>
		</>
	);
}

function Chain() {
	return (
		<svg
			viewBox="0 0 40 40"
			width="40"
			height="40"
			aria-hidden="true"
			className={s.chain}
		>
			<g fill="none" stroke="#0b0807" strokeWidth="6" strokeLinecap="round">
				<rect
					x="4"
					y="12"
					width="16"
					height="10"
					rx="5"
					transform="rotate(-35 12 17)"
				/>
				<rect
					x="20"
					y="18"
					width="16"
					height="10"
					rx="5"
					transform="rotate(-35 28 23)"
				/>
			</g>
			<g fill="none" stroke="#a8916a" strokeWidth="2.6" strokeLinecap="round">
				<rect
					x="4"
					y="12"
					width="16"
					height="10"
					rx="5"
					transform="rotate(-35 12 17)"
				/>
				<rect
					x="20"
					y="18"
					width="16"
					height="10"
					rx="5"
					transform="rotate(-35 28 23)"
				/>
			</g>
		</svg>
	);
}
