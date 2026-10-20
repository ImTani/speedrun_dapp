"use client";

/**
 * Plate: an engraved name plate for a Fragment.
 *
 *   <Plate name="Vesper" lead={T.wearsLead} epithet="Echo" marked mark={T.yours}
 *          emblem={<Mask aspect="echo" size={40} />} />
 *
 * Reads as:   VESPER            (display face, bright bone; gilt if `marked`)
 *             ──── ◆ ────
 *             wears  ECHO       (italic lead + engraved capitals)
 *
 * `variant="slab"` sits on a bevelled umber slab; `variant="bare"` floats over
 * a scene on a soft pool of ink. Every string is passed in from the lexicon.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { card, enter } from "../motion/presets";
import s from "./type.module.css";

export type PlateProps = {
	name: string;
	/** The aspect / title shown in engraved capitals under the name. */
	epithet?: string;
	/** Small italic word before the epithet (e.g. the lexicon's "wears"). */
	lead?: string;
	/** Mask or sigil drawn beside (start) or above (center) the name. */
	emblem?: ReactNode;
	/** Highlights the player's own Fragment in gilt. */
	marked?: boolean;
	/** Tiny gilt tag shown when marked (e.g. the lexicon's "yours"). */
	mark?: string;
	size?: "sm" | "md" | "lg";
	align?: "center" | "start";
	variant?: "slab" | "bare";
	/** Drop in with the shared card spring. */
	animated?: boolean;
	className?: string;
};

export function Plate({
	name,
	epithet,
	lead,
	emblem,
	marked = false,
	mark,
	size = "md",
	align = "center",
	variant = "slab",
	animated = false,
	className,
}: PlateProps) {
	const body = (
		<>
			{emblem ? (
				<span className={s.plateEmblem} aria-hidden="true">
					{emblem}
				</span>
			) : null}
			<span className={s.plateText}>
				<span className={s.plateName}>{name}</span>
				{epithet || lead ? (
					<>
						<span className={s.plateOrn} aria-hidden="true">
							<i />
						</span>
						<span className={s.plateEpithet}>
							{lead ? <span className={s.plateLead}>{lead}</span> : null}
							{epithet ? (
								<span className={s.plateAspect}>{epithet}</span>
							) : null}
						</span>
					</>
				) : null}
				{marked && mark ? <span className={s.plateMark}>{mark}</span> : null}
			</span>
		</>
	);

	const props = {
		className: className ? `${s.plate} ${className}` : s.plate,
		"data-size": size,
		"data-align": align,
		"data-variant": variant,
		"data-marked": marked ? "true" : "false",
		// Long names (up to 24) step the large plate's letters down before the ellipsis.
		"data-long": name.length > 18 ? 2 : name.length > 12 ? 1 : 0,
	};

	return animated ? (
		<motion.div {...props} {...enter(card)}>
			{body}
		</motion.div>
	) : (
		<div {...props}>{body}</div>
	);
}
