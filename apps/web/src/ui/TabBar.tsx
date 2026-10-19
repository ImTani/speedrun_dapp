"use client";

/**
 * The five ways out of the nave, carved into the stone ledge at the foot of the
 * screen. Icons are licensed game-icons.net carvings (see ./tabIcons.ts), cut in
 * relief: an ink shadow below, worn stone when idle, gilt and candle-glow when
 * this is where you stand. The Gathering sits raised on a round boss.
 */
import { motion } from "motion/react";
import { useId } from "react";
import { shell } from "@/lexicon/shell";
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

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
	const uid = useId().replace(/[^\w-]/g, "");
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
				const d = ICONS[t].d;
				return (
					<motion.button
						key={t}
						type="button"
						className={s.tab}
						data-on={on || undefined}
						data-center={center || undefined}
						aria-current={on ? "page" : undefined}
						whileTap={{ scale: 0.86, y: 2 }}
						transition={spring.press}
						onClick={() => {
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
							<motion.svg
								viewBox="0 0 512 512"
								className={s.icon}
								animate={{ y: on ? -2 : 0, scale: on ? 1.08 : 1 }}
								transition={spring.settle}
							>
								<path d={d} fill="#0b0807" transform="translate(0 26)" />
								<path
									d={d}
									fill={`url(#${on ? gilt : stone})`}
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
						</span>
						<span className={s.label}>{shell.tabs[t]}</span>
					</motion.button>
				);
			})}
		</nav>
	);
}
