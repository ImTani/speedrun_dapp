import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/landing/site";
import { ServiceWorker } from "@/ui/ServiceWorker";
import { fontVars } from "./fonts";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
	// Absolute URLs for the share cards (app/opengraph-image.tsx) on every route.
	metadataBase: new URL(SITE_URL),
	title: "Apostasy: Sede Vacante",
	description:
		"Bind a Fragment of a devoured god and send it to the Gatherings.",
	icons: { icon: "/icon.svg", apple: "/icon.svg" },
	appleWebApp: {
		capable: true,
		title: "Apostasy",
		statusBarStyle: "black-translucent",
	},
	formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
	themeColor: "#050403",
	colorScheme: "dark",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={fontVars}>
			<body>
				<Providers>{children}</Providers>
				<ServiceWorker />
			</body>
		</html>
	);
}
