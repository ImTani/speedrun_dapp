"use client";

/**
 * The bound Fragment's HUD, set into the Stage: standing (Degree, level, Resonance, Ash), the Vigil
 * with its Collect button, the Marks shelf and the notifications toggle. Plain labels and numbers.
 * Standing comes from the shared game state (one poll for the whole shell); Marks and the
 * wardrobe are read once and again only when the shared state says they changed.
 */
import {
	AnimatePresence,
	animate,
	motion,
	useReducedMotion,
} from "motion/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { buzz, HAPTIC, play, useSfx } from "@/audio";
import type { Api } from "@/client/api";
import { claimVigil, levelProgress, type Profile } from "@/client/economy";
import { type InventoryState, inventory } from "@/client/inventory";
import {
	bestTier,
	fetchMarks,
	type MarksResponse,
	type MarkTierView,
	type MarkView,
	markSeen,
	sealUrl,
	tierName,
	unseenMarks,
} from "@/client/marks";
import { usePush } from "@/client/push";
import { useGameState } from "@/client/state";
import { fx, PALETTES } from "@/fx";
import { economy } from "@/lexicon/economy";
import { roman } from "@/lexicon/gathering";
import { hud } from "@/lexicon/hud";
import { marks as M } from "@/lexicon/marks";
import { promoteMoment } from "@/screens/title/Moments";
import { PrimaryButton } from "@/ui/button";
import { easeOut, pressable, spring } from "@/ui/motion";
import { Count, Rubric } from "@/ui/type";
import h from "./hud.module.css";

// ---------------------------------------------------------------- data

export interface HudData {
	profile: Profile | null;
	profileDown: boolean;
	inv: InventoryState | null;
	marks: MarksResponse | null;
	setProfile: (p: Profile) => void;
}

/** Standing (shared state), wardrobe and Marks for the bound Fragment. */
export function useHud(api: Api): HudData {
	const { state, refresh } = useGameState();
	// A collect answers with the new standing at once; it stands in until a read that
	// started after the collect has landed (an older poll may still be on its way).
	const [claimed, setClaimed] = useState<Profile | null>(null);
	const [inv, setInv] = useState<InventoryState | null>(null);
	const [marks, setMarks] = useState<MarksResponse | null>(null);
	const earned = state?.marks.earned;
	const finish = state?.equipped.finish;
	const title = state?.equipped.title;

	// Marks: once, then whenever the shared count moves (no poll of its own).
	useEffect(() => {
		void earned;
		let live = true;
		fetchMarks(api)
			.then((m) => live && setMarks(m))
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [api, earned]);

	// Wardrobe: once, then whenever what is worn changes.
	useEffect(() => {
		void finish;
		void title;
		let live = true;
		inventory(api)
			.get()
			.then((i) => live && setInv(i))
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [api, finish, title]);

	const setProfile = useCallback(
		(p: Profile) => {
			setClaimed(p);
			void (async () => {
				await refresh();
				await refresh();
				setClaimed(null);
			})();
		},
		[refresh],
	);

	return {
		profile: claimed ?? state?.profile ?? null,
		profileDown: !!state && !state.profile,
		inv,
		marks,
		setProfile,
	};
}

// ---------------------------------------------------------------- standing

/**
 * A gilt bar. Pass `level` and a rise in it plays the level-up fill: the bar runs to full,
 * empties and settles at the new level's progress.
 */
function Bar({
	value,
	label,
	level,
}: {
	value: number;
	label: string;
	level?: number;
}) {
	const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
	const fill = useRef<HTMLSpanElement>(null);
	const lastLevel = useRef(level);
	const placed = useRef(false);
	const reduce = useReducedMotion() ?? false;

	useLayoutEffect(() => {
		const el = fill.current;
		if (!el) return;
		const to = pct / 100;
		const up =
			level != null && lastLevel.current != null && level > lastLevel.current;
		lastLevel.current = level;
		if (!placed.current || reduce) {
			placed.current = true;
			el.style.transform = `scaleX(${to})`;
			return;
		}
		if (!up) {
			const c = animate(el, { scaleX: to }, spring.soft);
			return () => c.stop();
		}
		let dead = false;
		let next: { stop: () => void } | null = null;
		const full = animate(el, { scaleX: 1 }, { duration: 0.42, ease: easeOut });
		full.then(() => {
			if (dead) return;
			next = animate(el, { scaleX: [0, to] }, { ...spring.soft, delay: 0.18 });
		});
		return () => {
			dead = true;
			full.stop();
			next?.stop();
		};
	}, [pct, level, reduce]);

	return (
		<div
			className={h.bar}
			role="progressbar"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={pct}
		>
			<span ref={fill} className={h.barFill} />
		</div>
	);
}

/** When the Vigil last paid out: the Ash counter ticks only for a rise the player caused. */
let collectedAt = 0;
const justCollected = () => Date.now() - collectedAt < 3000;

export function StandingCard({ profile: p }: { profile: Profile }) {
	const capped = p.level >= p.levelCap || p.resonanceToNext <= 0;
	const prevLevel = useRef(p.level);
	const prevDegree = useRef(p.degree);
	const levelRef = useRef<HTMLSpanElement>(null);
	const [rose, setRose] = useState<number | null>(null);
	const reduce = useReducedMotion() ?? false;
	const sfx = useSfx(["levelUp", "promote"]);

	// The level-up moment: the bar fills (see Bar), a three-note rise, a small gilt burst and
	// the level line pops.
	useEffect(() => {
		const up = p.level > prevLevel.current;
		prevLevel.current = p.level;
		if (!up) return;
		setRose(p.level);
		sfx.play("levelUp", { delay: 120 });
		sfx.buzz(HAPTIC.unlock);
		const el = levelRef.current;
		if (!el) return;
		fx.burst("sparkle", el, {
			rarity: "rare",
			palette: PALETTES.gilt,
			amount: 0.7,
			delay: 0.12,
		});
		if (!reduce)
			animate(el, { scale: [1, 1.18, 1] }, { duration: 0.5, ease: easeOut });
	}, [p.level, sfx, reduce]);

	// A Degree climbed (lower is higher): the shared promotion moment, once per Degree.
	useEffect(() => {
		if (p.degree < prevDegree.current) promoteMoment(p.degree);
		prevDegree.current = p.degree;
	}, [p.degree]);
	useEffect(() => {
		if (rose == null) return;
		const t = setTimeout(() => setRose(null), 2600);
		return () => clearTimeout(t);
	}, [rose]);

	return (
		<section className={h.card} aria-label={hud.standing}>
			<div className={h.head}>
				<span className={h.degree}>{economy.degreeOf(p.degree)}</span>
				<span className={h.ash} data-fx="hud-ash">
					<AshGlyph />
					<Count
						value={p.ash}
						tone="bone"
						size="md"
						tick={justCollected() ? "ash" : undefined}
					/>
					<span className={h.unit}>{economy.ash}</span>
				</span>
			</div>
			<div className={h.levelRow}>
				<span
					ref={levelRef}
					className={h.level}
					style={{ transformOrigin: "0 50%" }}
				>
					{economy.levelOf(p.level, p.levelCap)}
					<AnimatePresence>
						{rose != null ? (
							<motion.span
								key={rose}
								className={h.levelUp}
								initial={{ opacity: 0, scale: 0.6, y: 6 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={spring.slam}
							>
								{hud.levelUp(rose)}
							</motion.span>
						) : null}
					</AnimatePresence>
				</span>
				{capped ? null : (
					<span className={h.next}>{economy.toNext(p.resonanceToNext)}</span>
				)}
			</div>
			<div data-fx="hud-level">
				<Bar
					value={levelProgress(p)}
					label={economy.resonance}
					level={p.level}
				/>
			</div>
			{capped ? <p className={h.note}>{economy.capped}</p> : null}
		</section>
	);
}

function AshGlyph() {
	return (
		<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
			<path
				d="M10 2c1.6 3 5 5.2 5 9.2A5 5 0 0 1 5 11.2C5 8.6 6.6 7.4 7.4 5.6c.6 1.6 1.4 2.2 2.2 2.6C9.8 6 9.4 4 10 2Z"
				fill="#a8916a"
				stroke="#0b0807"
				strokeWidth="1.4"
			/>
		</svg>
	);
}

// ---------------------------------------------------------------- vigil

const SPARKS = Array.from({ length: 9 }, (_, i) => {
	const a = -Math.PI / 2 + ((i - 4) / 4) * 1.1;
	return { x: Math.cos(a) * (46 + (i % 3) * 14), y: Math.sin(a) * 58 };
});

const motes = (n: number) =>
	Math.max(4, Math.min(14, Math.round(Math.sqrt(n) * 1.6)));

/**
 * Ash and Resonance fly from the Collect button into the standing card. The standing
 * updates as the first mote lands, so the counter rolls while the rest come in.
 */
async function flyHome(
	from: Element | null,
	ash: number,
	res: number,
	land: () => void,
): Promise<void> {
	let landed = false;
	const once = () => {
		if (landed) return;
		landed = true;
		collectedAt = Date.now();
		land();
	};
	const ashTo = document.querySelector('[data-fx="hud-ash"]');
	const resTo = document.querySelector('[data-fx="hud-level"]');
	const flights: Promise<void>[] = [];
	if (from && ash > 0 && ashTo)
		flights.push(
			fx.flyTo(from, ashTo, { icon: "ash", count: motes(ash), onArrive: once }),
		);
	if (from && res > 0 && resTo)
		flights.push(
			fx.flyTo(from, resTo, {
				icon: "light",
				count: motes(res),
				duration: 0.95,
				onArrive: (i) => {
					once();
					play("light", { volume: 0.45, rate: 1 + Math.min(i, 10) * 0.03 });
				},
			}),
		);
	await Promise.all(flights);
	once();
}

export function VigilCard({
	api,
	profile: p,
	onClaimed,
}: {
	api: Api;
	profile: Profile;
	onClaimed: (p: Profile) => void;
}) {
	const v = p.vigil;
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	const [burst, setBurst] = useState<{
		id: number;
		ash: number;
		res: number;
	} | null>(null);
	const empty = v.ash <= 0 && v.resonance <= 0;
	const sfx = useSfx(["collect"]);
	const btn = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!burst) return;
		const t = setTimeout(() => setBurst(null), 1900);
		return () => clearTimeout(t);
	}, [burst]);

	const collect = async () => {
		if (busy || empty) return;
		buzz(HAPTIC.tap);
		setBusy(true);
		setFailed(false);
		try {
			const r = await claimVigil(api);
			const { ash, resonance } = r.gained;
			if (ash > 0 || resonance > 0) {
				sfx.play("collect");
				sfx.buzz(HAPTIC.collect);
				setBurst({ id: Date.now(), ash, res: resonance });
				// Held busy until the motes land: no second tap on a stale Vigil.
				await flyHome(btn.current, ash, resonance, () => onClaimed(r.profile));
			} else onClaimed(r.profile);
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className={h.card} data-full={v.full || undefined}>
			<div className={h.head}>
				<Rubric as="h3" size="sm">
					{economy.vigil.name}
				</Rubric>
				<span className={h.hours}>
					{v.full ? (
						<span className={h.fullTag}>{economy.vigil.full}</span>
					) : null}
					{economy.vigil.hours(v.hours, v.capHours)}
				</span>
			</div>
			<Bar
				value={v.capHours > 0 ? v.hours / v.capHours : 0}
				label={economy.vigil.name}
			/>
			<p className={h.waiting}>
				{empty ? economy.vigil.empty : hud.waiting(v.ash, v.resonance)}
			</p>
			{v.full ? <p className={h.note}>{hud.fullHint}</p> : null}
			<div className={h.claimWrap}>
				<PrimaryButton
					ref={btn}
					legacy={h.claim}
					size="md"
					haptic={false}
					disabled={busy || empty}
					loading={busy}
					onClick={collect}
					data-coach="collect"
				>
					{busy ? economy.vigil.claiming : economy.vigil.claim}
				</PrimaryButton>
				<AnimatePresence>
					{burst ? (
						<motion.div
							key={burst.id}
							className={h.burst}
							aria-live="polite"
							initial={{ opacity: 1 }}
							exit={{ opacity: 0, transition: { duration: 0.3 } }}
						>
							{SPARKS.map((s, i) => (
								<motion.span
									// biome-ignore lint/suspicious/noArrayIndexKey: fixed spark layout
									key={i}
									className={h.spark}
									initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
									animate={{ x: s.x, y: s.y, scale: 0.2, opacity: 0 }}
									transition={{
										duration: 0.75,
										delay: i * 0.015,
										ease: [0.16, 1, 0.3, 1],
									}}
								/>
							))}
							<motion.span
								className={h.gained}
								initial={{ opacity: 0, y: 6, scale: 0.9 }}
								animate={{ opacity: [0, 1, 1, 0], y: -34, scale: 1 }}
								transition={{ duration: 1.7, times: [0, 0.15, 0.7, 1] }}
							>
								{economy.vigil.gained(burst.ash, burst.res)}
							</motion.span>
						</motion.div>
					) : null}
				</AnimatePresence>
			</div>
			{failed ? (
				<p className={h.error} role="alert">
					{economy.errors.claimFailed}
				</p>
			) : null}
		</section>
	);
}

// ---------------------------------------------------------------- marks shelf

const glyphOf = (t: MarkTierView) => (t.tier > 0 ? roman(t.tier) : "†");

export function MarksShelf({ res }: { res: MarksResponse }) {
	const held = res.marks
		.map((m) => ({ mark: m, tier: bestTier(m) }))
		.filter((x): x is { mark: MarkView; tier: MarkTierView } => !!x.tier);
	const [open, setOpen] = useState<number | null>(null);
	const [fresh] = useState(
		() => new Set(unseenMarks(res).map((u) => u.mark.kind)),
	);

	// The glow plays once; after that the Marks count as seen.
	useEffect(() => {
		markSeen(unseenMarks(res));
	}, [res]);

	const picked = held.find((x) => x.mark.kind === open) ?? null;

	return (
		<section className={h.shelf}>
			<div className={h.head}>
				<Rubric as="h3" size="sm">
					{M.heading}
				</Rubric>
				<span className={h.count}>
					{hud.marksCount(held.length, res.marks.length)}
				</span>
			</div>
			{held.length === 0 ? (
				<p className={h.note}>{hud.marksNone}</p>
			) : (
				<ul className={h.medals}>
					{held.map(({ mark, tier }) => {
						const sealed = tier.state === "sealed";
						const name = tierName(mark, tier);
						return (
							<li key={mark.kind}>
								<motion.button
									type="button"
									className={h.medal}
									data-sealed={sealed || undefined}
									data-on={open === mark.kind || undefined}
									data-new={fresh.has(mark.kind) || undefined}
									aria-label={`${name}, ${sealed ? M.state.sealed : M.sealingSoon}`}
									aria-expanded={open === mark.kind}
									onClick={() =>
										setOpen((o) => (o === mark.kind ? null : mark.kind))
									}
									whileTap={{ scale: 0.9 }}
									transition={spring.press}
								>
									<span className={h.medalFace} aria-hidden="true">
										{glyphOf(tier)}
									</span>
								</motion.button>
								<span className={h.medalName} aria-hidden="true">
									{name}
								</span>
							</li>
						);
					})}
				</ul>
			)}
			<AnimatePresence initial={false} mode="wait">
				{picked ? (
					<motion.p
						key={picked.mark.kind}
						className={h.caption}
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
					>
						<strong>{tierName(picked.mark, picked.tier)}</strong>
						<span>
							{picked.tier.state === "sealed" ? M.state.sealed : M.sealingSoon}
						</span>
						{picked.tier.state === "sealed" && picked.tier.tx ? (
							<a
								href={sealUrl(picked.tier.tx)}
								target="_blank"
								rel="noreferrer"
								className={h.sealLink}
							>
								{hud.sealedLink}
							</a>
						) : null}
					</motion.p>
				) : null}
			</AnimatePresence>
		</section>
	);
}

// ---------------------------------------------------------------- notifications

function useIosBrowser(): boolean {
	const [ios, setIos] = useState(false);
	useEffect(() => {
		const nav = navigator as Navigator & { standalone?: boolean };
		const standalone =
			window.matchMedia?.("(display-mode: standalone)").matches ||
			nav.standalone === true;
		setIos(/iPhone|iPad|iPod/.test(nav.userAgent) && !standalone);
	}, []);
	return ios;
}

export function PushToggle({ api }: { api: Api }) {
	const push = usePush(api);
	const ios = useIosBrowser();
	const n = M.notify;

	if (push.state == null) return null;
	if (push.state === "unsupported")
		return ios ? <p className={h.pushNote}>{n.unsupported}</p> : null;
	if (push.state === "denied") return <p className={h.pushNote}>{n.denied}</p>;

	const on = push.state === "on";
	return (
		<div className={h.push}>
			<Bell on={on} />
			<span className={h.pushText}>
				{push.busy ? n.working : on ? n.on : n.offer}
				{push.failed ? (
					<span className={h.pushFail} role="alert">
						{n.failed}
					</span>
				) : null}
			</span>
			<motion.button
				type="button"
				role="switch"
				aria-checked={on}
				aria-label={n.offer}
				className={h.switch}
				data-on={on || undefined}
				disabled={push.busy}
				onClick={() => {
					buzz(HAPTIC.tap);
					if (on) push.disable();
					else push.enable();
				}}
				{...pressable}
			>
				<motion.span
					className={h.knob}
					animate={{ x: on ? 22 : 0 }}
					transition={spring.snappy}
				/>
			</motion.button>
		</div>
	);
}

function Bell({ on }: { on: boolean }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width="22"
			height="22"
			aria-hidden="true"
			className={h.bell}
		>
			<path
				d="M12 3a5 5 0 0 0-5 5v3.2c0 1.3-.5 2.6-1.4 3.6L4.5 16h15l-1.1-1.2a5.3 5.3 0 0 1-1.4-3.6V8a5 5 0 0 0-5-5Zm-2 15a2 2 0 0 0 4 0"
				fill={on ? "#e3c27c" : "none"}
				stroke={on ? "#0b0807" : "#a8916a"}
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
