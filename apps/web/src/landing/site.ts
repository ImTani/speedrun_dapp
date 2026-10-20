import type { Viewport } from "next";

/** The public address. The QR code on the landing page and the share cards point here. */
export const SITE_URL = "https://sede-vacante.vercel.app";
export const PLAY_URL = `${SITE_URL}/play`;
/** PLAY_URL without the scheme, for reading aloud or typing. */
export const PLAY_URL_SHORT = PLAY_URL.replace(/^https?:\/\//, "");
export const GITHUB_URL = "https://github.com/ImTani/speedrun_dapp";
/** Every licensed source, served from public/. */
export const ATTRIBUTION_URL = "/ATTRIBUTION.md";

/** Snowtrace (Fuji) page for a contract. */
export const fujiExplorer = (address: string) =>
	`https://testnet.snowtrace.io/address/${address}`;

/**
 * Reading pages (landing, legal) let readers zoom: the game locks the scale for its touch
 * controls, but a page of text must allow pinch-zoom (WCAG 1.4.4).
 */
export const READING_VIEWPORT: Viewport = {
	maximumScale: 5,
	userScalable: true,
};
