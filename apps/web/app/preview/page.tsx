import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewClient } from "./PreviewClient";

// Dev-only screen harness: every screen state on fixtures, no login, no database.
// See ./README.md for the URL list.

export const metadata: Metadata = {
	title: "Preview",
	robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PreviewPage({
	searchParams,
}: {
	searchParams: Promise<Search>;
}) {
	if (process.env.NODE_ENV === "production") notFound();
	const q = await searchParams;
	return (
		<PreviewClient
			screen={one(q.screen)}
			state={one(q.state)}
			me={one(q.me)}
			gathering={one(q.gathering)}
			aspect={one(q.aspect)}
			frame={one(q.frame)}
			op={one(q.op)}
			delay={one(q.delay)}
		/>
	);
}
