"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { engine } from "./engine";

/**
 * The one particle canvas. Mount once, high in the shell. It sits above the
 * screens, sheets, toasts and modals (unlock sparks must land on top of the
 * unlock moment) and never takes a touch. Hidden while nothing is alive.
 */
const style: CSSProperties = {
	position: "fixed",
	left: 0,
	top: 0,
	pointerEvents: "none",
	zIndex: "calc(var(--z-modal, 70) + 5)",
	visibility: "hidden",
	contain: "strict",
};

export function FxLayer() {
	const ref = useRef<HTMLCanvasElement | null>(null);
	useEffect(() => {
		const c = ref.current;
		const e = engine();
		if (!c || !e) return;
		e.attach(c);
		return () => e.detach(c);
	}, []);
	return <canvas ref={ref} style={style} />;
}
