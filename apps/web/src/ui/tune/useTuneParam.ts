"use client";

import { useEffect, useState } from "react";

/**
 * The value of ?tune in the address ("" when bare, e.g. "open" or a preset id), or null when
 * absent. Read after mount, so the server render and players never see the tuning panel.
 */
export function useTuneParam(): string | null {
	const [v, setV] = useState<string | null>(null);
	useEffect(() => {
		const q = new URLSearchParams(window.location.search);
		setV(q.has("tune") ? (q.get("tune") ?? "") : null);
	}, []);
	return v;
}
