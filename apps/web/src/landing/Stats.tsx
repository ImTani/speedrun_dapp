"use client";

/**
 * Live totals from GET /api/stats. Each number counts up once, the first time the row
 * scrolls into view (straight to the value under reduced motion). Screen readers get the
 * final number, never the roll.
 */
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { landing } from "@/lexicon/landing";
import { easeOut } from "@/ui/motion/presets";
import s from "./landing.module.css";
import type { Stats as StatsBody } from "./types";

const L = landing.chain;
const fmt = new Intl.NumberFormat("en-US");

type Phase =
	| { kind: "loading" }
	| { kind: "down" }
	| { kind: "ok"; body: StatsBody };

export function Stats() {
	const [phase, setPhase] = useState<Phase>({ kind: "loading" });
	const ref = useRef<HTMLDListElement>(null);
	const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });

	useEffect(() => {
		const ctl = new AbortController();
		fetch("/api/stats", { signal: ctl.signal })
			.then((r) => (r.ok ? (r.json() as Promise<StatsBody>) : Promise.reject()))
			.then((body) => setPhase({ kind: "ok", body }))
			.catch(() => {
				if (!ctl.signal.aborted) setPhase({ kind: "down" });
			});
		return () => ctl.abort();
	}, []);

	const fuji = phase.kind === "ok" ? phase.body.chains["43113"] : undefined;
	const main = phase.kind === "ok" ? phase.body.chains["43114"] : undefined;
	const ok = phase.kind === "ok";
	const n = (v: number | undefined) => (ok ? (v ?? 0) : null);

	return (
		<>
			<dl ref={ref} className={s.stats} aria-busy={phase.kind === "loading"}>
				<Stat
					label={L.moves}
					note={L.movesNote}
					value={n(fuji?.transactions)}
					run={seen}
				/>
				<Stat label={L.gatherings} value={n(fuji?.gatherings)} run={seen} />
				<Stat label={L.fragments} value={n(fuji?.fragments)} run={seen} />
				{main && main.transactions > 0 ? (
					<Stat label={L.mainnet} value={main.transactions} run={seen} />
				) : null}
			</dl>
			{phase.kind === "down" ? (
				<p className={s.statsDown} role="status">
					{L.down}
				</p>
			) : null}
		</>
	);
}

function Stat({
	label,
	note,
	value,
	run,
}: {
	label: string;
	note?: string;
	/** null while loading or unavailable. */
	value: number | null;
	run: boolean;
}) {
	const out = useRef<HTMLSpanElement>(null);
	const reduce = useReducedMotion() ?? false;

	useEffect(() => {
		const el = out.current;
		if (!el || value === null) return;
		if (!run || reduce || value === 0) {
			el.textContent = fmt.format(run || reduce ? value : 0);
			return;
		}
		const ctl = animate(0, value, {
			duration: Math.min(2, 0.8 + Math.log10(1 + value) * 0.3),
			ease: easeOut,
			onUpdate: (v) => {
				el.textContent = fmt.format(Math.round(v));
			},
		});
		return () => ctl.stop();
	}, [value, run, reduce]);

	return (
		<div className={s.stat}>
			<dt className={s.statLabel}>
				{label}
				{note ? <span className={s.statNote}>{note}</span> : null}
			</dt>
			<dd className={s.statValue}>
				{value === null ? (
					<span className={s.statPending}>
						<span aria-hidden="true">—</span>
						<span className="sr-only">{L.loading}</span>
					</span>
				) : (
					<>
						<span ref={out} aria-hidden="true">
							0
						</span>
						<span className="sr-only">{fmt.format(value)}</span>
					</>
				)}
			</dd>
		</div>
	);
}
