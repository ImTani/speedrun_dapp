"use client";

/**
 * The two SVG filters every control shares, mounted once into <body> on first use:
 *
 *  - `#ctl-ring` (CSS: `var(--ctl-ring-fx)`): the keyboard focus ring. It reads the alpha of
 *    whatever it is applied to and draws a 2px gilt ring past a 2px soot gap around it, so
 *    the ring follows the real silhouette: the wax bar and its seal, a chamfered card, a
 *    round token, a pill. Apply it to the layer that IS the shape (never to a layer with an
 *    outer glow or drop shadow: list those after it, `filter: var(--ctl-ring-fx) <shadow>`).
 *    It is a blur-and-threshold offset, so the ring keeps an even width on curves and
 *    diagonals (a square dilation would not). Costs nothing until something is focused.
 *  - `#ctl-edge` (CSS: `var(--ctl-edge-fx)`): the wax family's uneven pressed edge, a static
 *    displacement (rasterised with the face; never animated).
 *
 * Every control calls `useControlDefs()`, which also sets the two CSS handles on :root.
 * Before that runs the variables are unset, so the filters are simply skipped (the edge is
 * smooth for a frame; focus cannot happen yet). Every use of them in CSS keeps a fallback
 * or sits in a rule that only applies on focus.
 */
import { useEffect } from "react";

export const RING_ID = "ctl-ring";
export const EDGE_ID = "ctl-edge";

/*
 * Ring maths (stdDeviation s, threshold t: the contour sits where a blurred straight edge
 * falls to t, at d = -s * PhiInverse(t)):
 *   outer contour: s 2.4, t 0.030 -> 4.5px out (slope 35 keeps the edge about 1px soft)
 *   gap contour:   s 1.2, t 0.048 -> 2px out   (slope 12)
 */
const MARKUP = `
<filter id="${RING_ID}" x="-30%" y="-45%" width="160%" height="190%" color-interpolation-filters="sRGB">
	<feComponentTransfer in="SourceAlpha" result="a"><feFuncA type="linear" slope="40"/></feComponentTransfer>
	<feGaussianBlur in="a" stdDeviation="2.4" result="ob"/>
	<feComponentTransfer in="ob" result="o"><feFuncA type="linear" slope="35" intercept="-1.05"/></feComponentTransfer>
	<feGaussianBlur in="a" stdDeviation="1.2" result="ib"/>
	<feComponentTransfer in="ib" result="i"><feFuncA type="linear" slope="12" intercept="-0.576"/></feComponentTransfer>
	<feFlood style="flood-color: var(--ctl-ring, #f5dfa0)" result="rc"/>
	<feComposite in="rc" in2="o" operator="in" result="r1"/>
	<feComposite in="r1" in2="i" operator="out" result="ring"/>
	<feFlood style="flood-color: var(--c-soot, #0b0807)" result="gc"/>
	<feComposite in="gc" in2="i" operator="in" result="g1"/>
	<feComposite in="g1" in2="a" operator="out" result="gap"/>
	<feMerge><feMergeNode in="ring"/><feMergeNode in="gap"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="${EDGE_ID}" x="-5%" y="-25%" width="110%" height="150%" color-interpolation-filters="sRGB">
	<feTurbulence type="fractalNoise" baseFrequency="0.045 0.11" numOctaves="2" seed="11" result="n"/>
	<feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;

/** Mounts the shared filters (idempotent; a no-op on the server). */
export function ensureControlDefs(): void {
	if (typeof document === "undefined") return;
	if (document.getElementById(RING_ID)) return;
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "0");
	svg.setAttribute("height", "0");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("focusable", "false");
	svg.setAttribute("data-control-defs", "");
	svg.style.cssText =
		"position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
	svg.innerHTML = MARKUP;
	document.body.appendChild(svg);
	// the CSS handles to them (see the Controls tokens in app/globals.css)
	const css = document.createElement("style");
	css.setAttribute("data-control-defs", "");
	css.textContent = `:root{--ctl-ring-fx:url(#${RING_ID});--ctl-edge-fx:url(#${EDGE_ID})}`;
	document.head.appendChild(css);
}

/** Call in every control: makes sure the ring and edge filters exist. */
export function useControlDefs(): void {
	useEffect(ensureControlDefs, []);
}
