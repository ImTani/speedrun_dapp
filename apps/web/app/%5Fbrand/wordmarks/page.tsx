import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devTools } from "@/devTools";
import { WordmarksClient } from "./WordmarksClient";

// Dev-only: the B family (b1-b3: the illuminated lettering, three capital As) side by side, on
// the cover composition and on the title screen's lower half, plus 28 px and 300 px lockups.
// URL: /_brand/wordmarks (add ?live=1 to light the glass).

export const metadata: Metadata = {
	title: "Wordmarks",
	robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;

export default async function WordmarksPage({
	searchParams,
}: {
	searchParams: Promise<Search>;
}) {
	if (!devTools) notFound();
	const q = await searchParams;
	const live = [q.live].flat().includes("1");
	return <WordmarksClient live={live} />;
}
