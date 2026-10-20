import { ImageResponse } from "next/og";
import { landing } from "@/lexicon/landing";
import { MASK } from "@/scene/masks.js";
import { PLAY_URL_SHORT } from "./site";

/**
 * The share card (Open Graph and Twitter): the name, the line, and the Echo mask with its
 * ember eyes. Drawn in code; no image files. The faces are fetched from Google Fonts at
 * build time (OFL); if that fails the card still renders in the default face.
 */
export const OG_SIZE = { width: 1200, height: 630 };

async function font(family: string, weight: number, text: string) {
	try {
		const css = await fetch(
			`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
		).then((r) => r.text());
		const url = css.match(
			/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
		)?.[1];
		if (!url) return null;
		return await fetch(url).then((r) => r.arrayBuffer());
	} catch {
		return null;
	}
}

export async function renderOg(): Promise<ImageResponse> {
	const H = landing.hero;
	const svg = MASK.mask("echo", 400, {
		variant: "gilded",
		glow: true,
		still: true,
		fit: "square",
		id: "og",
	}).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
	const mask = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

	const [display, caps, text] = await Promise.all([
		font("Grenze+Gotisch", 800, H.name),
		font("Cinzel", 700, H.sub.toUpperCase()),
		font("Alegreya", 500, `${H.line}${PLAY_URL_SHORT}`),
	]);
	const fonts = [
		display && { name: "Grenze Gotisch", data: display, weight: 800 as const },
		caps && { name: "Cinzel", data: caps, weight: 700 as const },
		text && { name: "Alegreya", data: text, weight: 500 as const },
	].filter((f) => !!f);

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				padding: "0 72px",
				gap: 56,
				backgroundColor: "#050403",
				backgroundImage:
					"radial-gradient(circle at 24% 50%, #3a2a1d 0%, #120c0a 38%, #050403 70%)",
				color: "#f3e6c8",
			}}
		>
			{/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain img */}
			<img src={mask} width={400} height={400} alt="" />
			<div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
				<div
					style={{
						fontFamily: "Grenze Gotisch",
						fontSize: 156,
						lineHeight: 0.9,
						color: "#e9cc8a",
						textShadow: "0 4px 0 #0b0807",
					}}
				>
					{H.name}
				</div>
				<div
					style={{
						fontFamily: "Cinzel",
						fontSize: 30,
						letterSpacing: 9,
						color: "#e8574d",
						marginTop: 14,
					}}
				>
					{H.sub.toUpperCase()}
				</div>
				<div
					style={{
						fontFamily: "Alegreya",
						fontSize: 38,
						lineHeight: 1.25,
						marginTop: 34,
						maxWidth: 600,
					}}
				>
					{H.line}
				</div>
				<div
					style={{
						fontFamily: "Alegreya",
						fontSize: 26,
						color: "#c2ae88",
						marginTop: 30,
					}}
				>
					{PLAY_URL_SHORT}
				</div>
			</div>
		</div>,
		{ ...OG_SIZE, fonts },
	);
}
