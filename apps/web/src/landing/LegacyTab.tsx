"use client";

import { useEffect } from "react";

/**
 * Links from before the game moved to /play ("/?tab=gathering" in older notifications and
 * bookmarks) land here: send them on into the game. Renders nothing; the page stays static.
 */
export function LegacyTab() {
	useEffect(() => {
		const q = window.location.search;
		if (new URLSearchParams(q).has("tab")) window.location.replace(`/play${q}`);
	}, []);
	return null;
}
