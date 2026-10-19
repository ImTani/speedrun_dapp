"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { spring } from "./presets";

/**
 * Wrap the app once (in the shell or Providers): honours the OS reduce-motion
 * setting for every motion component and sets the house default transition.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
	return (
		<MotionConfig reducedMotion="user" transition={spring.settle}>
			{children}
		</MotionConfig>
	);
}
