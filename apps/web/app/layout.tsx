import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorker } from "@/ui/ServiceWorker";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "Apostasy: Sede Vacante",
	description:
		"Bind a Fragment of a devoured god and send it to the Gatherings.",
	icons: { icon: "/icon.svg", apple: "/icon.svg" },
	appleWebApp: {
		capable: true,
		title: "Apostasy",
		statusBarStyle: "black-translucent",
	},
};

export const viewport: Viewport = {
	themeColor: "#0b0807",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin=""
				/>
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,500&family=Grenze+Gotisch:wght@700;900&display=swap"
				/>
			</head>
			<body>
				<Providers>{children}</Providers>
				<ServiceWorker />
			</body>
		</html>
	);
}
