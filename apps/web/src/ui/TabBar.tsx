"use client";

/**
 * The five ways out of the nave, carved into the stone ledge at the foot of the
 * screen. Icons are licensed game-icons.net carvings (see ./tabIcons.ts), cut in
 * relief: an ink shadow below, worn stone when idle, gilt and candle-glow when
 * this is where you stand. The Gathering sits raised on a round boss.
 * Ways not yet open are sunk dark with a small lock; a way that just opened glows
 * and lifts until it is visited.
 */
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { shell } from "@/lexicon/shell";
import { unlocks as U } from "@/lexicon/unlocks";
import { haptic } from "@/ui/motion/impact";
import { spring } from "@/ui/motion/presets";
import s from "./TabBar.module.css";
import { ICONS } from "./tabIcons";

export type Tab = keyof typeof shell.tabs;
export const TAB_ORDER: readonly Tab[] = [
	"fragment",
	"spire",
	"gathering",
	"reliquary",
	"vestry",
];

export function TabBar({
	tab,
	onTab,
	locked,
	lit,
	onLocked,
}: {
	tab: Tab;
	onTab: (t: Tab) => void;
	/** Ways not yet open: dimmed, and a tap calls onLocked instead of onTab. */
	locked?: Partial<Record<Tab, boolean>>;
	/** Ways that just opened: they glow and lift until visited. */
	lit?: Partial<Record<Tab, boolean>>;
	onLocked?: (t: Tab) => void;
}) {
	const uid = useId().replace(/[^\w-]/g, "");
	const reduce = useReducedMotion() ?? false;
	const stone = `${uid}-stone`;
	const gilt = `${uid}-gilt`;
	return (
		<nav className={s.bar} aria-label={shell.ways}>
			<svg className={s.defs} aria-hidden="true" focusable="false">
				<defs>
					<linearGradient id={stone} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#c4ad84" />
						<stop offset="0.55" stopColor="#8a7456" />
						<stop offset="1" stopColor="#5a4632" />
					</linearGradient>
					<linearGradient id={gilt} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#fff1c8" />
						<stop offset="0.4" stopColor="#e3c27c" />
						<stop offset="0.75" stopColor="#c9a24f" />
						<stop offset="1" stopColor="#8a6a2e" />
					</linearGradient>
				</defs>
			</svg>
			{TAB_ORDER.map((t) => {
				const on = t === tab;
				const center = t === "gathering";
				const shut = !on && !!locked?.[t];
				const glowing = !on && !shut && !!lit?.[t];
				const d = ICONS[t].d;
				return (
					<motion.button
						key={t}
						type="button"
						className={s.tab}
						data-on={on || undefined}
						data-center={center || undefined}
						data-locked={shut || undefined}
						data-lit={glowing || undefined}
						data-coach={`tab-${t}`}
						aria-current={on ? "page" : undefined}
						aria-disabled={shut || undefined}
						aria-label={shut ? `${shell.tabs[t]}, ${U.locked}` : undefined}
						whileTap={
							shut
								? // A shake has more than two keyframes: springs can't run it.
									{
										x: [0, -3, 3, -2, 0],
										transition: { duration: 0.32, ease: "easeOut" },
									}
								: { scale: 0.86, y: 2 }
						}
						transition={spring.press}
						onClick={() => {
							if (shut) {
								haptic([6, 30, 6]);
								onLocked?.(t);
								return;
							}
							if (!on) haptic(8);
							onTab(t);
						}}
					>
						{on && (
							<motion.span
								layoutId={`${uid}-notch`}
								className={s.notch}
								transition={spring.settle}
								aria-hidden="true"
							/>
						)}
						<span className={s.well} aria-hidden="true">
							{on && (
								<motion.span
									layoutId={`${uid}-glow`}
									className={s.glow}
									transition={spring.settle}
								/>
							)}
							{glowing ? (
								<motion.span
									className={s.fresh}
									initial={{ opacity: 0, scale: 0.4 }}
									animate={
										reduce
											? { opacity: 1, scale: 1 }
											: { opacity: [0.55, 1, 0.55], scale: [0.92, 1.08, 0.92] }
									}
									transition={
										reduce
											? { duration: 0.2 }
											: {
													duration: 1.8,
													repeat: Number.POSITIVE_INFINITY,
													ease: "easeInOut",
												}
									}
								/>
							) : null}
							<motion.svg
								viewBox="0 0 512 512"
								className={s.icon}
								animate={{
									y: on ? -2 : glowing ? -4 : 0,
									scale: on ? 1.08 : glowing ? 1.12 : 1,
								}}
								transition={spring.settle}
							>
								<path d={d} fill="#0b0807" transform="translate(0 26)" />
								<path
									d={d}
									fill={`url(#${on || glowing ? gilt : stone})`}
									stroke="#0b0807"
									strokeWidth="12"
									strokeLinejoin="round"
									paintOrder="stroke"
								/>
								<path
									d={d}
									fill="none"
									stroke={on ? "#fff6dc" : "#e9dcc0"}
									strokeWidth="5"
									opacity={on ? 0.35 : 0.14}
									transform="translate(-4 -6)"
								/>
							</motion.svg>
							{shut ? <Lock /> : null}
						</span>
						<span className={s.label}>{shell.tabs[t]}</span>
					</motion.button>
				);
			})}
		</nav>
	);
}

/** A small iron padlock set over a closed way. */
function Lock() {
	return (
		<svg viewBox="0 0 20 22" className={s.lock} aria-hidden="true">
			<path
				d="M5.5 10V7a4.5 4.5 0 0 1 9 0v3"
				fill="none"
				stroke="#0b0807"
				strokeWidth="4.4"
				strokeLinecap="round"
			/>
			<path
				d="M5.5 10V7a4.5 4.5 0 0 1 9 0v3"
				fill="none"
				stroke="#a8916a"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<rect
				x="2.5"
				y="9.5"
				width="15"
				height="11"
				rx="2.5"
				fill="#6e5c46"
				stroke="#0b0807"
				strokeWidth="2"
			/>
			<circle cx="10" cy="15" r="1.7" fill="#0b0807" />
		</svg>
	);
}
