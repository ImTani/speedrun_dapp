"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { legal } from "@/lexicon/legal.ts";
import { NOTICE_KEY } from "./config.ts";
import s from "./legal.module.css";

export interface CookieNoticeProps {
	/** Sit above the tab bar (default). Pass false on screens without one, e.g. the title screen. */
	aboveTabBar?: boolean;
	/** Sit at the top of the screen instead (screens whose own call to action holds the foot). */
	top?: boolean;
}

function seen(): boolean {
	try {
		return localStorage.getItem(NOTICE_KEY) === "1";
	} catch {
		return true; // storage blocked: nothing is stored, so there is nothing to tell
	}
}

/**
 * One-line storage notice, shown until dismissed (remembered in localStorage). Non-blocking:
 * no focus trap, no overlay, never takes focus. Renders nothing on the server and once dismissed.
 * Docked above the tab bar it publishes its height as `--notice-h` on <html>, so toasts
 * (src/ui/coach/toast.module.css) ride above it instead of on top of it.
 */
export function CookieNotice({
	aboveTabBar = true,
	top = false,
}: CookieNoticeProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLElement>(null);
	const docked = aboveTabBar && !top;

	useEffect(() => {
		if (!seen()) setOpen(true);
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!open || !docked || !el) return;
		const root = document.documentElement;
		const set = () =>
			root.style.setProperty(
				"--notice-h",
				`${Math.ceil(el.offsetHeight) + 8}px`,
			);
		set();
		const ro = new ResizeObserver(set);
		ro.observe(el);
		return () => {
			ro.disconnect();
			root.style.removeProperty("--notice-h");
		};
	}, [open, docked]);

	if (!open) return null;

	const dismiss = () => {
		try {
			localStorage.setItem(NOTICE_KEY, "1");
		} catch {}
		setOpen(false);
	};

	return (
		<aside
			ref={ref}
			aria-label={legal.notice.label}
			className={`${s.notice} ${top ? s.noticeTop : aboveTabBar ? "" : s.noticeLow}`}
		>
			<p className={s.noticeText}>
				{legal.notice.text} <Link href="/cookies">{legal.notice.link}</Link>
			</p>
			<button type="button" className={s.noticeDismiss} onClick={dismiss}>
				{legal.notice.dismiss}
			</button>
		</aside>
	);
}
