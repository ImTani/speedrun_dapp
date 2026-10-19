"use client";

// The current Degree's five floors, the boss on top. Tap an open or cleared floor to choose it.
import { motion } from "motion/react";
import type { SpireFloor } from "@/client/spire";
import { roman } from "@/lexicon/gathering";
import { spire as T } from "@/lexicon/spire";
import { Mask } from "@/ui/Mask";
import { listVariants, pressableSoft, rise } from "@/ui/motion";
import s from "./spire.module.css";

function subline(f: SpireFloor, levelCap: number): string {
	if (f.status === "locked")
		return f.lock === "level" ? T.lock.level(levelCap) : T.lock.below;
	return `${T.aspects[f.aspect] ?? ""} · ${T.need(f.need)}`;
}

export function Tower({
	floors,
	levelCap,
	selected,
	onSelect,
}: {
	floors: readonly SpireFloor[];
	levelCap: number;
	selected: number | null;
	onSelect: (floor: number) => void;
}) {
	const top = [...floors].reverse();
	return (
		<motion.ol
			className={s.tower}
			variants={listVariants(0.05)}
			initial="hidden"
			animate="shown"
		>
			{top.map((f) => {
				const locked = f.status === "locked";
				const status = T.status[f.status];
				return (
					<motion.li key={f.floor} variants={rise}>
						<motion.button
							type="button"
							className={s.floor}
							data-boss={f.boss ? "true" : "false"}
							data-status={f.status}
							data-selected={selected === f.floor ? "true" : "false"}
							disabled={locked}
							aria-pressed={locked ? undefined : selected === f.floor}
							aria-label={T.floorAria(f.floor, f.name, status)}
							onClick={() => onSelect(f.floor)}
							{...(locked ? {} : pressableSoft)}
						>
							<span className={s.floorNum} aria-hidden="true">
								{roman(f.floor)}
							</span>
							<span className={s.mask} aria-hidden="true">
								<Mask
									aspect={f.aspect}
									size={f.boss ? 54 : 44}
									variant={f.status === "cleared" ? "ink" : "grisaille"}
									glow={f.status === "open"}
								/>
							</span>
							<span className={s.floorText}>
								<span className={s.floorName}>{f.name}</span>
								<span className={s.floorSub}>
									{f.boss && !locked ? (
										<span className={s.bossTag}>{T.boss} · </span>
									) : null}
									{subline(f, levelCap)}
								</span>
							</span>
							{f.status !== "open" ? (
								<span className={s.floorTag} data-status={f.status}>
									{status}
								</span>
							) : (
								<span />
							)}
						</motion.button>
					</motion.li>
				);
			})}
		</motion.ol>
	);
}
