"use client";

/**
 * The one rule, taught on a card before the practice duel: four squares, one per outcome of a
 * toll. Tap a square (or "Show me") to turn it: both moves show, the Light flies to whoever
 * earned it, and a plain line under the card says what happened. The numbers are the real
 * payoff (@arena/strategies scoreTurn). Once all four are seen, one closing line, then the duel.
 */
import { Move, scoreTurn } from "@arena/strategies";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { buzz, play as cue, HAPTIC } from "@/audio";
import { fx, PALETTES } from "@/fx";
import { type Outcome, onboarding as T } from "@/lexicon/onboarding";
import { PrimaryButton } from "@/ui/button";
import { spring } from "@/ui/motion";
import { MoveGlyph } from "./MoveGlyph";
import s from "./rule.module.css";

const { Cooperate: K, Defect: D } = Move;

/** The four outcomes, in teaching order (reading order on the card). */
const CELLS: readonly { id: Outcome; mine: Move; theirs: Move }[] = [
	{ id: "both-kindle", mine: K, theirs: K },
	{ id: "i-devour", mine: D, theirs: K },
	{ id: "they-devour", mine: K, theirs: D },
	{ id: "both-devour", mine: D, theirs: D },
];

/** Which outcome a pair of moves is. */
export function outcomeOf(mine: Move, theirs: Move): Outcome {
	if (mine === K) return theirs === K ? "both-kindle" : "they-devour";
	return theirs === K ? "i-devour" : "both-devour";
}

/** The colour of an outcome: gold for shared Light, blood for a Devour, ash for both. */
export const toneOf = (o: Outcome) =>
	o === "both-kindle" ? "kindle" : o === "both-devour" ? "ash" : "devour";

const SMALL = { amount: 0.35, scale: 0.7 } as const;

export function Rule({ onDone }: { onDone: () => void }) {
	const [seen, setSeen] = useState<boolean[]>(() => CELLS.map(() => false));
	const [now, setNow] = useState<number | null>(null);
	// The Light shown in each square, filled as the motes land.
	const [vals, setVals] = useState<[number, number][]>(() =>
		CELLS.map(() => [0, 0]),
	);
	// Each turn of a square is a run: arrivals from an older run are ignored, and the tiles
	// re-turn when a seen square is tapped again.
	const runs = useRef(CELLS.map(() => 0));
	const [turns, setTurns] = useState<number[]>(() => CELLS.map(() => 0));
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const card = useRef<HTMLDivElement>(null);
	const btn = useRef<HTMLButtonElement>(null);
	const reduce = useReducedMotion() ?? false;
	const all = seen.every(Boolean);
	const next = seen.indexOf(false);

	useEffect(() => {
		btn.current?.focus();
		const ts = timers.current;
		return () => {
			for (const t of ts) clearTimeout(t);
		};
	}, []);

	const turn = (i: number) => {
		const c = CELLS[i];
		if (!c) return;
		runs.current[i] = (runs.current[i] ?? 0) + 1;
		const run = runs.current[i];
		setTurns((v) => v.map((x, j) => (j === i ? run : x)));
		setSeen((v) => v.map((x, j) => x || j === i));
		setNow(i);
		setVals((v) => v.map((x, j) => (j === i ? [0, 0] : x)));
		const light = scoreTurn(c.mine, c.theirs);
		const root = card.current?.querySelector<HTMLElement>(`[data-cell="${i}"]`);
		const el = (sel: string) => root?.querySelector<HTMLElement>(sel) ?? null;
		const devours = [c.mine === D, c.theirs === D] as const;
		cue("unveil", { volume: 0.6 });
		// The verdict strikes as the cards finish turning.
		const t = setTimeout(() => {
			if (runs.current[i] !== run) return;
			if (devours[0] && devours[1]) {
				cue("devour", { volume: 0.55, rate: 0.84 });
				for (const k of ["me", "them"]) {
					const m = el(`[data-side="${k}"]`);
					if (m) fx.burst("shards", m, SMALL);
				}
			} else if (devours[0] || devours[1]) {
				cue("devour", { volume: 0.6 });
				const victim = el(`[data-side="${devours[0] ? "them" : "me"}"]`);
				if (victim)
					fx.burst("shards", victim, { ...SMALL, palette: PALETTES.devour });
				if (devours[1]) buzz(HAPTIC.devour);
			} else {
				cue("kindle", { volume: 0.65 });
				const pool = el("[data-pool]");
				if (pool) fx.burst("kindle", pool, SMALL);
			}
			// Each side's Light: torn from the one it devoured, or risen between the two.
			(["me", "them"] as const).forEach((k, side) => {
				const gain = light[side] ?? 0;
				if (gain <= 0) return;
				const to = el(`[data-gain="${k}"]`);
				const from =
					devours[side] && !devours[1 - side]
						? el(`[data-side="${k === "me" ? "them" : "me"}"]`)
						: el("[data-pool]");
				const land = (n: number) => {
					if (runs.current[i] !== run) return;
					setVals((v) =>
						v.map((x, j) => {
							if (j !== i) return x;
							const out: [number, number] = [x[0], x[1]];
							out[side] = Math.min(gain, (out[side] ?? 0) + n);
							return out;
						}),
					);
				};
				if (!from || !to) {
					land(gain);
					return;
				}
				void fx.stream(from, to, {
					count: gain,
					duration: 0.5,
					stagger: 0.08,
					size: 3,
					onArrive: (n) => {
						land(1);
						cue("light", {
							rate: 1 + n * 0.06,
							pitchJitter: 0.15,
							volume: 0.6,
						});
					},
				});
			});
		}, 220);
		timers.current.push(t);
	};

	const said = now == null ? null : CELLS[now];

	return (
		<motion.div
			className={s.phase}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8, transition: { duration: 0.16 } }}
			transition={spring.settle}
		>
			<div className={s.body}>
				<h2 className={s.heading}>{T.rule.intro}</h2>
				<div className={s.legend}>
					<span className={s.key} data-move="kindle">
						<MoveGlyph devour={false} className={s.keyGlyph} />
						<b>{T.rule.kindle}</b>
						<span className={s.means}>= {T.rule.kindleMeans}</span>
					</span>
					<span className={s.key} data-move="devour">
						<MoveGlyph devour className={s.keyGlyph} />
						<b>{T.rule.devour}</b>
						<span className={s.means}>= {T.rule.devourMeans}</span>
					</span>
				</div>

				<div className={s.card} ref={card}>
					{CELLS.map((c, i) => {
						const shown = seen[i] ?? false;
						const light = scoreTurn(c.mine, c.theirs);
						const v = vals[i] ?? [0, 0];
						return (
							<motion.button
								key={c.id}
								type="button"
								className={s.cell}
								data-cell={i}
								data-shown={shown || undefined}
								data-now={now === i || undefined}
								data-next={(!shown && i === next) || undefined}
								data-tone={toneOf(c.id)}
								aria-label={T.rule.cellLabel(
									T.rule.cell[c.id],
									light[0],
									light[1],
									shown,
								)}
								onClick={() => {
									buzz(8);
									turn(i);
								}}
								whileTap={reduce ? {} : { scale: 0.97 }}
							>
								<span className={s.cellTitle}>{T.rule.cell[c.id]}</span>
								<span className={s.pair}>
									<Face
										who="me"
										label={T.rule.you}
										move={shown ? c.mine : null}
										gain={v[0]}
										full={light[0]}
										reduce={reduce}
										run={turns[i] ?? 0}
									/>
									<span className={s.pool} data-pool aria-hidden="true" />
									<Face
										who="them"
										label={T.rule.rival}
										move={shown ? c.theirs : null}
										gain={v[1]}
										full={light[1]}
										reduce={reduce}
										run={turns[i] ?? 0}
									/>
								</span>
							</motion.button>
						);
					})}
				</div>

				<div className={s.lineBox} aria-live="polite">
					<AnimatePresence mode="wait" initial={false}>
						<motion.p
							key={said ? said.id : "hint"}
							className={s.says}
							data-tone={said ? toneOf(said.id) : undefined}
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, transition: { duration: 0.1 } }}
							transition={spring.settle}
						>
							{said ? T.rule.says[said.id] : T.rule.tapHint}
						</motion.p>
					</AnimatePresence>
					<AnimatePresence>
						{all ? (
							<motion.p
								key="moral"
								className={s.moral}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ ...spring.settle, delay: 0.9 }}
							>
								{T.rule.moral}
							</motion.p>
						) : null}
					</AnimatePresence>
				</div>
			</div>

			<div className={s.foot}>
				<PrimaryButton
					ref={btn}
					legacy="btn btn-blood"
					onClick={() => {
						if (all) onDone();
						else if (next >= 0) turn(next);
					}}
				>
					{all ? T.rule.go : T.rule.unveil}
				</PrimaryButton>
			</div>
		</motion.div>
	);
}

/** One side of a square: its move (or a veil), who it is, and the Light it drew. */
function Face({
	who,
	label,
	move,
	gain,
	full,
	reduce,
	run,
}: {
	who: "me" | "them";
	label: string;
	move: Move | null;
	gain: number;
	full: number;
	reduce: boolean;
	run: number;
}) {
	const delay = who === "them" ? 0.08 : 0;
	return (
		<span className={s.face}>
			<span className={s.tile} data-side={who}>
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.span
						key={`${move ?? "veil"}${run}`}
						className={s.tileFace}
						data-move={
							move == null ? "veiled" : move === D ? "devour" : "kindle"
						}
						initial={
							reduce ? { opacity: 0 } : { opacity: 0, rotateY: 90, scale: 1.12 }
						}
						animate={{ opacity: 1, rotateY: 0, scale: 1 }}
						exit={{ opacity: 0, transition: { duration: 0.1 } }}
						transition={{
							...spring.slam,
							delay,
							opacity: { duration: 0.1, delay },
						}}
					>
						{move == null ? (
							<span className={s.veil} aria-hidden="true">
								?
							</span>
						) : (
							<MoveGlyph devour={move === D} className={s.glyph} />
						)}
					</motion.span>
				</AnimatePresence>
			</span>
			<span className={s.who}>{label}</span>
			<span
				className={s.gain}
				data-gain={who}
				data-on={move != null || undefined}
				data-zero={(move != null && full === 0) || undefined}
				aria-hidden="true"
			>
				{move == null ? " " : `+${gain}`}
			</span>
		</span>
	);
}
