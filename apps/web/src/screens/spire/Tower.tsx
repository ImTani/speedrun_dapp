"use client";

// The current Degree's five floors, the boss on top. Tap an open or cleared floor to choose it.
// Each floor is a SelectableCard: the slab, the gilt selected rim and the focus ring are all
// cut to the same chamfer, so they turn the corners together.
import { motion } from "motion/react";
import type { SpireFloor } from "@/client/spire";
import { roman } from "@/lexicon/gathering";
import { spire as T } from "@/lexicon/spire";
import { SelectableCard } from "@/ui/controls";
import { Mask } from "@/ui/Mask";
import { listVariants, rise } from "@/ui/motion";
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
						<SelectableCard
							className={s.floor}
							data-boss={f.boss ? "true" : "false"}
							data-status={f.status}
							tone={f.boss ? "blood" : undefined}
							selected={!locked && selected === f.floor}
							disabled={locked}
							aria-label={T.floorAria(f.floor, f.name, status)}
							onClick={() => onSelect(f.floor)}
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
						</SelectableCard>
					</motion.li>
				);
			})}
		</motion.ol>
	);
}
