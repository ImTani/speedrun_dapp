import type { Metadata, Viewport } from "next";
import { Landing } from "@/landing/Landing";
import { READING_VIEWPORT } from "@/landing/site";
import { landing } from "@/lexicon/landing";

// The public front door. The game itself lives at /play (and the installed app opens there).

export const metadata: Metadata = {
	title: landing.meta.title,
	description: landing.meta.description,
	alternates: { canonical: "/" },
	openGraph: {
		type: "website",
		url: "/",
		siteName: "Apostasy: Sede Vacante",
		title: landing.meta.title,
		description: landing.meta.description,
	},
	twitter: {
		card: "summary_large_image",
		title: landing.meta.title,
		description: landing.meta.description,
	},
};

export const viewport: Viewport = READING_VIEWPORT;

export default function Home() {
	return <Landing />;
}
