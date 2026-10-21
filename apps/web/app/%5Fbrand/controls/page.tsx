import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devTools } from "@/devTools";
import { ControlsClient } from "./ControlsClient";
import { SystemClient } from "./SystemClient";

// Dev-only: the control system (src/ui/controls + the wax primary) in every state, and the
// screens' compositions with it. URL: /_brand/controls.
// ?before=1: the controls as the screens draw them today, grouped by type (the old sheet,
// kept for before/after captures). The written inventory and API: src/ui/CONTROLS.md.

export const metadata: Metadata = {
	title: "Controls",
	robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;

export default async function ControlsPage({
	searchParams,
}: {
	searchParams: Promise<Search>;
}) {
	if (!devTools) notFound();
	const q = await searchParams;
	const before = [q.before].flat().includes("1");
	return before ? <ControlsClient /> : <SystemClient />;
}
