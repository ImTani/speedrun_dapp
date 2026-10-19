"use client";

/**
 * The Spire tab: the current Degree's five floors (the Remnant boss on top), climbs left, and the
 * climb itself. A climb plays its five turns quickly, then shows the outcome and what it paid.
 */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, useApi } from "@/client/api";
import {
	type ClimbResponse,
	climbFloor,
	fetchSpire,
	type SpireFloor,
	type SpireState,
} from "@/client/spire";
import { ATTEMPTS_MAX } from "@/game/spire";
import { spire as T } from "@/lexicon/spire";
import { pressable } from "@/ui/motion";
import { ClimbView } from "./ClimbView";
import s from "./spire.module.css";
import { Tower } from "./Tower";

const PIPS = Array.from({ length: ATTEMPTS_MAX }, (_, i) => i + 1);

type View =
	| { kind: "tower" }
	| { kind: "asking"; floor: number }
	| { kind: "duel"; floor: SpireFloor; res: ClimbResponse };

/** The floor to offer first: the lowest open one, else the highest cleared (to climb again). */
function defaultFloor(st: SpireState): number | null {
	const open = st.floors.find((f) => f.status === "open");
	if (open) return open.floor;
	const cleared = st.floors.filter((f) => f.status === "cleared").at(-1);
	return cleared?.floor ?? null;
}

function errorText(e: unknown): string {
	if (!(e instanceof ApiError)) return T.errors.generic;
	if (e.status === 503) return T.errors.unavailable;
	if (e.message === "no_attempts") return T.errors.noClimbs;
	if (e.message === "floor_locked") return T.errors.locked;
	if (e.message === "busy") return T.errors.busy;
	return T.errors.generic;
}

function useNow(ms: number): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), ms);
		return () => clearInterval(t);
	}, [ms]);
	return now;
}

export function SpireScreen() {
	const api = useApi();
	const [state, setState] = useState<SpireState | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [picked, setPicked] = useState<number | null>(null);
	const [view, setView] = useState<View>({ kind: "tower" });
	const now = useNow(20_000);

	const load = useCallback(async () => {
		try {
			setState(await fetchSpire(api));
			setErr(null);
		} catch (e) {
			setErr(errorText(e));
		}
	}, [api]);

	useEffect(() => {
		load();
	}, [load]);

	// A climb came back: refresh once the clock passes it.
	const nextAt = state?.attempts.nextAt ?? null;
	useEffect(() => {
		if (nextAt != null && now >= nextAt) load();
	}, [now, nextAt, load]);

	const floors = state?.floors ?? [];
	const pickedFloor = floors.find(
		(f) => f.floor === picked && f.status !== "locked",
	);
	const selected = pickedFloor?.floor ?? (state ? defaultFloor(state) : null);
	const target = floors.find((f) => f.floor === selected) ?? null;

	const climb = async () => {
		if (!state || !target || view.kind !== "tower") return;
		setErr(null);
		setView({ kind: "asking", floor: target.floor });
		try {
			const res = await climbFloor(api, target.floor);
			setView({ kind: "duel", floor: target, res });
			setState(res.state);
		} catch (e) {
			setErr(errorText(e));
			setView({ kind: "tower" });
			load();
		}
	};

	const finish = () => {
		if (view.kind === "duel" && view.res.result.won) setPicked(null);
		setView({ kind: "tower" });
	};

	if (!state)
		return (
			<section className={s.screen}>
				<div className={s.column}>
					<p
						className={err ? s.banner : s.loading}
						role={err ? "alert" : undefined}
					>
						{err ?? T.loading}
					</p>
					{err ? (
						<button type="button" className="btn btn-ghost" onClick={load}>
							{T.errors.retry}
						</button>
					) : null}
				</div>
			</section>
		);

	const left = state.attempts.left;
	const wait = state.attempts.nextAt != null ? state.attempts.nextAt - now : 0;

	return (
		<section className={s.screen}>
			<div className={s.column}>
				<header className={s.head}>
					<div className={s.titleBlock}>
						<h1 className={s.title}>{T.title}</h1>
						<p className={s.meta}>
							{T.degreeOf(state.degree)} ·{" "}
							{T.levelOf(state.level, state.levelCap)}
						</p>
					</div>
					<div className={s.climbs}>
						<span className={s.climbsLabel}>
							{T.climbs}
							<span className="sr-only">
								{" "}
								{T.climbsOf(left, state.attempts.max)}
							</span>
						</span>
						<span className={s.climbPips} aria-hidden="true">
							{PIPS.slice(0, state.attempts.max).map((n) => (
								<span
									key={n}
									className={s.climbPip}
									data-full={n <= left ? "true" : "false"}
								/>
							))}
						</span>
						<span className={s.climbsNext}>
							{state.attempts.nextAt != null ? T.nextIn(wait) : T.full}
						</span>
					</div>
				</header>

				{err ? (
					<p className={s.banner} role="alert">
						{err}
					</p>
				) : null}

				<AnimatePresence mode="wait" initial={false}>
					{view.kind === "duel" && state.fragment ? (
						<motion.div
							key="duel"
							className={s.view}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.22 }}
						>
							<ClimbView
								res={view.res}
								floor={view.floor}
								fragment={state.fragment}
								onDone={finish}
							/>
						</motion.div>
					) : (
						<motion.div
							key="tower"
							className={s.view}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.22 }}
						>
							{state.summit ? (
								<div className={s.summit}>
									<p className={s.summitName}>{T.summit}</p>
									<p className={s.note}>{T.summitLine}</p>
								</div>
							) : null}
							<Tower
								floors={state.floors}
								levelCap={state.levelCap}
								selected={selected}
								onSelect={setPicked}
							/>
							<div className={s.action}>
								{!state.fragment ? (
									<p className={s.note}>{T.noFragment}</p>
								) : target ? (
									<>
										<p className={s.reward}>
											<span className={s.rewardTag}>
												{target.status === "cleared"
													? T.duel.replay
													: T.duel.firstClear}
											</span>
											<span>
												{T.reward(target.reward.ash, target.reward.resonance)}
											</span>
										</p>
										<motion.button
											type="button"
											className={`btn btn-blood ${s.climbBtn}`}
											disabled={left < 1 || view.kind === "asking"}
											onClick={climb}
											{...pressable}
										>
											{view.kind === "asking"
												? T.climbing
												: left < 1
													? T.noClimbsUntil(wait)
													: target.status === "cleared"
														? T.climbAgain(target.floor)
														: T.climb(target.floor)}
										</motion.button>
									</>
								) : (
									<p className={s.note}>{T.pick}</p>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</section>
	);
}
