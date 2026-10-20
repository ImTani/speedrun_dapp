"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { legal } from "@/lexicon/legal.ts";
import { NOTICE_KEY } from "./config.ts";
import s from "./legal.module.css";

export interface CookieNoticeProps {
	/** Sit above the tab bar (default). Pass false on screens without one, e.g. the title screen. */
	aboveTabBar?: boolean;
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
 */
export function CookieNotice({ aboveTabBar = true }: CookieNoticeProps) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!seen()) setOpen(true);
	}, []);

	if (!open) return null;

	const dismiss = () => {
		try {
			localStorage.setItem(NOTICE_KEY, "1");
		} catch {}
		setOpen(false);
	};

	return (
		<aside
			aria-label={legal.notice.label}
			className={`${s.notice} ${aboveTabBar ? "" : s.noticeLow}`}
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
