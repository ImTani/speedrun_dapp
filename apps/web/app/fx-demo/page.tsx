import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FxDemoClient } from "./FxDemoClient";

// Dev-only particle bench: a button per effect, two counters for streams.
// `?loop=<effect id>` re-fires one effect every 1.2 s (for screenshots).

export const metadata: Metadata = {
	title: "FX demo",
	robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;

export default async function FxDemoPage({
	searchParams,
}: {
	searchParams: Promise<Search>;
}) {
	if (process.env.NODE_ENV === "production") notFound();
	const q = await searchParams;
	const loop = Array.isArray(q.loop) ? q.loop[0] : q.loop;
	return <FxDemoClient loop={loop ?? null} />;
}
