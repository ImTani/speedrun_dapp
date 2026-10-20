"use client";

/**
 * The look in force: BUTTON_STYLE, unless the URL says `?btn=<look>` (remembered for the
 * tab's session so it survives in-app navigation). The server and the hydration pass
 * both render BUTTON_STYLE, so an override never causes a hydration mismatch.
 */
import { useSyncExternalStore } from "react";
import { BUTTON_STYLE, type ButtonLook, isButtonLook } from "./config";

const KEY = "apostasy:btn";
let cached: ButtonLook | null = null;

function read(): ButtonLook {
	if (cached) return cached;
	let look: ButtonLook = BUTTON_STYLE;
	try {
		const q = new URLSearchParams(window.location.search);
		if (q.has("btn")) {
			const v = q.get("btn");
			if (isButtonLook(v)) {
				sessionStorage.setItem(KEY, v);
				look = v;
			} else sessionStorage.removeItem(KEY);
		} else {
			const v = sessionStorage.getItem(KEY);
			if (isButtonLook(v)) look = v;
		}
	} catch {
		/* storage blocked: the constant stands */
	}
	cached = look;
	return look;
}

const subscribe = () => () => {};
const server = () => BUTTON_STYLE;

export function useButtonLook(): ButtonLook {
	return useSyncExternalStore(subscribe, read, server);
}
