"use client";

// One climb played back: five turns, Kindle or Devour per side, Light tallied against the floor's
// need, then the outcome and what it paid.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HAPTIC, play, useSfx } from "@/audio";
import type { ClimbResponse, DuelTurn, SpireFloor } from "@/client/spire";
import { FX, fx, PALETTES } from "@/fx";
import { turnLight } from "@/game/spire";
import { roman } from "@/lexicon/gathering";
import { spire as T } from "@/lexicon/spire";
import { promoteMoment } from "@/screens/title/Moments";
import { PrimaryButton } from "@/ui/button";
import { Mask } from "@/ui/Mask";
import { easeOut, IMPACT, impact, spring, useShake } from "@/ui/motion";
import { Count, Slam } from "@/ui/type";
import s from "./spire.module.css";

const WARM = ["kindle", "devour", "win", "lose", "promote"] as const;

/** A turn's pip punching in: a small flare of light, or blood shards for a Devour. */
function pipFlare(root: HTMLElement | null, n: number, turn: DuelTurn): void {
	if (!root) return;
	for (const side of ["mine", "theirs"] as const) {
		const el = root.querySelector(
			`ol[data-side="${side}"] > li:nth-child(${n})`,
		);
		if (!el) continue;
		const bite = (side === "mine" ? turn.mine : turn.theirs) === 1;
		if (bite)
			fx.burst("shards", el, {
				palette: PALETTES.devour,
				amount: 0.3,
				scale: 0.7,
				spread: 6,
			});
		else fx.burst("kindle", el, { amount: 0.25, scale: 0.6, spread: 6 });
	}
}

const motes = (n: number) =>
	Math.max(3, Math.min(12, Math.round(Math.sqrt(n) * 1.4)));

/** What a clear paid flies home: Ash to the Fragment tab, Resonance into the Degree line. */
function payOut(from: Element | null, ash: number, res: number): void {
	if (!from) return;
	const ashTo = document.querySelector('[data-coach="tab-fragment"]');
	const resTo = document.querySelector('[data-fx="spire-standing"]');
	if (ash > 0 && ashTo)
		void fx.flyTo(from, ashTo, {
			icon: "ash",
			count: motes(ash),
			duration: 1.1,
			onArrive: (i) => play("ash", { rate: 1 + Math.min(i, 10) * 0.04 }),
		});
	if (res > 0 && resTo)
		void fx.flyTo(from, resTo, {
			icon: "light",
			count: motes(res),
			onArrive: (i) =>
				play("light", { volume: 0.5, rate: 1 + Math.min(i, 10) * 0.04 }),
		});
}

const FIRST_MS = 420;
const STEP_MS = 640;

function Cell({
	turn,
	side,
	shown,
}: {
	turn: DuelTurn;
	side: "mine" | "theirs";
	shown: boolean;
}) {
	const reduce = useReducedMotion() ?? false;
	const move = side === "mine" ? turn.mine : turn.theirs;
	const [a, b] = turnLight(turn);
	const pts = side === "mine" ? a : b;
	return (
		<li className={s.cell} aria-hidden="true">
			<span className={s.socket}>
				{shown ? (
					<motion.span
						className={s.pip}
						data-move={move === 1 ? "devour" : "kindle"}
						initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.7 }}
						animate={{
							opacity: 1,
							scale: 1,
							transition: {
								...spring.slam,
								delay: side === "theirs" ? 0.06 : 0,
								opacity: { duration: 0.1 },
							},
						}}
					/>
				) : null}
			</span>
			<span className={s.pts} data-zero={pts === 0 ? "true" : "false"}>
				{shown ? `+${pts}` : ""}
			</span>
		</li>
	);
}

export function ClimbView({
	res,
	floor,
	fragment,
	onDone,
}: {
	res: ClimbResponse;
	floor: SpireFloor;
	fragment: { name: string; aspect: number };
	onDone: () => void;
}) {
	const reduce = useReducedMotion() ?? false;
	const { turns, need, won } = res.result;
	const [shown, setShown] = useState(reduce ? turns.length : 0);
	const [settled, setSettled] = useState(false);
	const shaker = useShake<HTMLDivElement>();
	const resultRef = useRef<HTMLDivElement>(null);
	const sfx = useSfx(WARM);
	const played = shown >= turns.length;
	const cols = useMemo(() => turns.map((t, i) => ({ t, n: i + 1 })), [turns]);

	useEffect(() => {
		if (played) return;
		const t = setTimeout(
			() => setShown((n) => n + 1),
			shown === 0 ? FIRST_MS : STEP_MS,
		);
		return () => clearTimeout(t);
	}, [shown, played]);

	// A small blow for each turn; heavier when someone devours.
	useEffect(() => {
		if (shown === 0 || reduce) return;
		const t = turns[shown - 1];
		if (!t) return;
		const bite = t.mine === 1 || t.theirs === 1;
		impact(
			shaker,
			bite
				? { stop: 50, amp: 6, duration: 0.24, twist: 0.4, buzz: [12] }
				: IMPACT.tap,
		);
		// Quiet: five of these in three seconds, under the result that follows.
		sfx.play(bite ? "devour" : "kindle", { volume: bite ? 0.26 : 0.3 });
		pipFlare(shaker.ref.current, shown, t);
	}, [shown, reduce, turns, shaker, sfx]);

	// Let the result word land a beat after the last turn.
	useEffect(() => {
		if (!played) return;
		const t = setTimeout(() => setSettled(true), reduce ? 0 : 380);
		return () => clearTimeout(t);
	}, [played, reduce]);

	const [mine, theirs] = useMemo(
		() =>
			turns.slice(0, shown).reduce<[number, number]>(
				([x, y], t) => {
					const [a, b] = turnLight(t);
					return [x + a, y + b];
				},
				[0, 0],
			),
		[turns, shown],
	);

	const r = res.rewards;
	const sub = [T.duel.score(res.result.myLight, need)];
	if (won && (r.ash > 0 || r.resonance > 0))
		sub.push(T.reward(r.ash, r.resonance));
	if (res.promoted) sub.push(T.duel.promoted(res.promoted.degree));
	const kicker = won
		? r.first
			? T.duel.firstClear
			: T.duel.replay
		: undefined;
	const fill = Math.min(1, mine / Math.max(1, need));

	return (
		<div className={s.view}>
			<div ref={shaker.ref}>
				<section className={s.duel} aria-label={T.floor(floor.floor)}>
					<div className={s.side}>
						<Mask
							aspect={floor.aspect}
							size={floor.boss ? 60 : 52}
							variant="grisaille"
							glow
						/>
						<div className={s.sideText}>
							<p className={s.sideName}>{floor.name}</p>
							<p className={s.sideSub}>
								{floor.boss ? `${T.boss} · ` : ""}
								{T.aspects[floor.aspect]}
							</p>
						</div>
						<div className={s.sideLight}>
							<span className={s.sideLightLabel}>{T.duel.light}</span>
							<Count
								value={theirs}
								from={0}
								tone="bone"
								size="md"
								showDelta={false}
							/>
						</div>
					</div>

					<ol className={s.turns} data-side="theirs">
						{cols.map((c) => (
							<Cell key={c.n} turn={c.t} side="theirs" shown={c.n <= shown} />
						))}
					</ol>
					<ol className={s.turnNums} aria-hidden="true">
						{cols.map((c) => (
							<li
								key={c.n}
								className={s.turnNum}
								data-now={c.n === shown ? "true" : "false"}
							>
								{roman(c.n)}
							</li>
						))}
					</ol>
					<ol className={s.turns} data-side="mine">
						{cols.map((c) => (
							<Cell key={c.n} turn={c.t} side="mine" shown={c.n <= shown} />
						))}
					</ol>

					<div className={s.side}>
						<Mask aspect={fragment.aspect} size={52} glow />
						<div className={s.sideText}>
							<p className={s.sideName}>{fragment.name}</p>
							<p className={s.sideSub}>{T.aspects[fragment.aspect]}</p>
						</div>
						<div className={s.sideLight}>
							<span className={s.sideLightLabel}>{T.duel.light}</span>
							<Count value={mine} from={0} tone="gilt" size="lg" />
						</div>
					</div>

					<div className={s.need}>
						<div className={s.needBar}>
							<motion.span
								className={s.needFill}
								data-met={mine >= need ? "true" : "false"}
								initial={false}
								animate={{ scaleX: fill }}
								transition={{ duration: reduce ? 0 : 0.4, ease: easeOut }}
							/>
						</div>
						<p className={s.needText}>
							<span>
								<strong>{mine}</strong> / {need}
							</span>
							<span>{T.need(need)}</span>
						</p>
					</div>

					<p className={s.legend} aria-hidden="true">
						<span>
							<span className={s.pip} data-move="kindle" />
							{T.duel.kindle}
						</span>
						<span>
							<span className={s.pip} data-move="devour" />
							{T.duel.devour}
						</span>
					</p>

					<ol className="sr-only">
						{cols.slice(0, shown).map((c) => (
							<li key={c.n}>
								{T.duel.turnAria(c.n, c.t.mine === 1, c.t.theirs === 1)}
							</li>
						))}
					</ol>

					<AnimatePresence>
						{settled ? (
							<motion.div
								key="result"
								ref={resultRef}
								className={s.result}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.2 }}
							>
								<Slam
									text={won ? T.duel.won : T.duel.lost}
									tone={won ? "kindle" : "devour"}
									{...(kicker ? { kicker } : {})}
									sub={sub}
									onImpact={() => {
										const el = resultRef.current;
										if (won) {
											impact(shaker, { ...IMPACT.kindle, buzz: false });
											sfx.play("win");
											sfx.buzz(HAPTIC.win);
											if (el) {
												fx.burst("unlock", el, { spread: 50 });
												fx.ring(el, FX.gilt, { radius: 170, width: 7 });
											}
											payOut(el, r.ash, r.resonance);
											const up = res.promoted;
											// The boss fell: the Degree moment, once the clear has rung.
											if (up) setTimeout(() => promoteMoment(up.degree), 1600);
										} else {
											impact(shaker, { ...IMPACT.devour, buzz: false });
											sfx.play("lose");
											sfx.buzz(HAPTIC.lose);
											if (el) fx.burst("ash", el, { spread: 70 });
										}
									}}
								/>
							</motion.div>
						) : null}
					</AnimatePresence>
				</section>
			</div>

			<div className={s.duelActions}>
				{settled ? (
					<PrimaryButton
						legacy={`btn btn-blood ${s.climbBtn}`}
						onClick={onDone}
						initial={{ opacity: 0, y: 8 }}
						animate={{
							opacity: 1,
							y: 0,
							transition: { delay: reduce ? 0 : 0.6 },
						}}
					>
						{T.duel.continue}
					</PrimaryButton>
				) : (
					<button
						type="button"
						className={s.skip}
						onClick={() => setShown(turns.length)}
					>
						{T.duel.skip}
					</button>
				)}
			</div>
		</div>
	);
}
