"use client";

/**
 * Picks the hero: HERO_VARIANT (src/landing/heroConfig.ts), unless the URL says `?hero=a|b|c`
 * (or `?hero=current`). The server and the hydration pass both render the configured hero
 * (passed in as children), so an override never causes a hydration mismatch; the others are
 * loaded only when asked for.
 */
import dynamic from "next/dynamic";
import { type ReactNode, useSyncExternalStore } from "react";
import {
	HERO_PARAM,
	HERO_VARIANT,
	type HeroVariant,
	isHeroVariant,
} from "../heroConfig";

const HeroNave = dynamic(() => import("./HeroNave").then((m) => m.HeroNave));
const HeroFaceoff = dynamic(() =>
	import("./HeroFaceoff").then((m) => m.HeroFaceoff),
);
const HeroRose = dynamic(() => import("./HeroRose").then((m) => m.HeroRose));

const subscribe = () => () => {};
const server = (): HeroVariant => HERO_VARIANT;
function read(): HeroVariant {
	const v = new URLSearchParams(window.location.search).get(HERO_PARAM);
	return isHeroVariant(v) ? v : HERO_VARIANT;
}

export function HeroSwitch({
	current,
	children,
}: {
	/** The shipped "current" hero (server-rendered), for `?hero=current`. */
	current: ReactNode;
	/** The configured hero, as the server rendered it. */
	children: ReactNode;
}) {
	const v = useSyncExternalStore(subscribe, read, server);
	if (v === HERO_VARIANT) return children;
	if (v === "a") return <HeroNave />;
	if (v === "b") return <HeroFaceoff />;
	if (v === "c") return <HeroRose />;
	return current;
}
