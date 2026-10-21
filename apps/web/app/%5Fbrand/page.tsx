import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devTools } from "@/devTools";
import { BrandClient } from "./BrandClient";

// Dev-only render pages for the submission's brand and listing assets (logo, wordmark,
// cover, key art, mask row, screenshot frames). Composed from the game's own components and
// captured headless at exact sizes by submission/brand/tools/capture.cjs. URL: /_brand?a=<asset>
// (the folder is "%5Fbrand" because a bare "_brand" folder is private in the app router).

export const metadata: Metadata = {
	title: "Brand render",
	robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BrandPage({
	searchParams,
}: {
	searchParams: Promise<Search>;
}) {
	if (!devTools) notFound();
	const q = await searchParams;
	const params: Record<string, string> = {};
	for (const [k, v] of Object.entries(q)) {
		const s = one(v);
		if (s !== undefined) params[k] = s;
	}
	return <BrandClient q={params} />;
}
