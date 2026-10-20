"use client";

/**
 * Brand render pages (dev only). Every asset is composed from the game's own drawn art:
 * the Mask set, the RoseWindow and GlassWindow glass, the title nave and the title's lettering.
 *
 *   /_brand?a=logo&bg=dark|clear|maskable      square, fills the viewport
 *   /_brand?a=wordmark&lay=stack|row&bg=dark|clear
 *   /_brand?a=cover                              840 x 300 (capture at DPR 1 and 2)
 *   /_brand?a=key[&mark=0]                       1920 x 1080 key art (title nave + wordmark)
 *   /_brand?a=logosvg&bg=dark|maskable[&show=1] the logo as one flat SVG, written to #svgout
 *   /_brand?a=masks                              the seven masks in a row
 *   /_brand?a=frame&shot=<name>&cap=<caption>    1080 x 1920 listing card around a phone capture
 *
 * The capture script waits for [data-ready] on the root before it shoots.
 */
import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { L } from "@/lexicon";
import { svgURL } from "@/screens/title/ink";
import { naveBox, naveSVG } from "@/screens/title/nave";
import { TitleScene } from "@/screens/title/TitleScene";
import { GlassWindow, RoseWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import b from "./brand.module.css";

type Q = Record<string, string>;

const num = (v: string | undefined, d: number) => {
	const n = Number(v);
	return Number.isFinite(n) && v !== undefined && v !== "" ? n : d;
};

/** Viewport size, measured once on mount (the capture sets it before navigating). */
function useViewport() {
	const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
	useEffect(() => {
		setVp({ w: window.innerWidth, h: window.innerHeight });
	}, []);
	return vp;
}

/** Flag the root ready after the art has had `ms` to light. */
function useReady(ms: number) {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		let dead = false;
		const go = async () => {
			await document.fonts.ready;
			await new Promise((r) => setTimeout(r, ms));
			if (!dead) setReady(true);
		};
		go();
		return () => {
			dead = true;
		};
	}, [ms]);
	return ready;
}

export function BrandClient({ q }: { q: Q }) {
	const a = q.a ?? "index";
	const clear = q.bg === "clear";
	const vp = useViewport();
	const ready = useReady(num(q.wait, 2600));
	const root: CSSProperties = { width: "100vw", height: "100vh" };
	return (
		<>
			{/* The dev overlay's badge stays out of the captures. */}
			<style>{"nextjs-portal{display:none!important}"}</style>
			{clear ? (
				<style>{"html,body{background:transparent!important}"}</style>
			) : null}
			<div
				className={b.root}
				data-ready={ready && vp ? "" : undefined}
				data-clear={clear || undefined}
				style={root}
			>
				{!vp ? null : a === "logo" ? (
					<Logo size={Math.min(vp.w, vp.h)} q={q} />
				) : a === "logosvg" ? (
					<LogoSvg size={Math.min(vp.w, vp.h)} q={q} ready={ready} />
				) : a === "wordmark" ? (
					<WordmarkPlate q={q} w={vp.w} h={vp.h} />
				) : a === "cover" ? (
					<Cover w={vp.w} h={vp.h} q={q} />
				) : a === "key" ? (
					<KeyArt w={vp.w} h={vp.h} q={q} />
				) : a === "masks" ? (
					<MaskRow q={q} />
				) : a === "frame" ? (
					<Frame w={vp.w} h={vp.h} q={q} />
				) : (
					<Index />
				)}
			</div>
		</>
	);
}

function Index() {
	const links = [
		"?a=logo&bg=dark",
		"?a=logo&bg=maskable",
		"?a=wordmark&lay=stack&bg=dark",
		"?a=wordmark&lay=row&bg=dark",
		"?a=cover",
		"?a=key",
		"?a=masks",
		"?a=frame&cap=Climb%20the%20Spire",
	];
	return (
		<ul className={b.index}>
			{links.map((l) => (
				<li key={l}>
					<a href={`/_brand${l}`}>{l}</a>
				</li>
			))}
		</ul>
	);
}

// ---------------------------------------------------------------- the wordmark

/** The title's lettering: gilt blackletter name over the blood Cinzel rubric with its rules. */
export function Wordmark({
	size,
	lay = "stack",
	style,
}: {
	/** Cap size of the name in px. */
	size: number;
	lay?: "stack" | "row";
	style?: CSSProperties;
}) {
	return (
		<div className={b.mark} data-lay={lay} style={{ fontSize: size, ...style }}>
			<span className={b.name}>
				<span className={b.nameInk} aria-hidden="true">
					Apostasy
				</span>
				<span className={b.nameFill}>Apostasy</span>
			</span>
			<span className={b.sub}>
				<i className={b.rule} />
				<span>Sede Vacante</span>
				<i className={b.rule} />
			</span>
		</div>
	);
}

function WordmarkPlate({ q, w, h }: { q: Q; w: number; h: number }) {
	const lay = q.lay === "row" ? "row" : "stack";
	const pad = num(q.pad, 0.09);
	const ref = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState(100);
	// Fit: measure at 100 px once the faces are in, then scale to the plate less its padding.
	useEffect(() => {
		let dead = false;
		document.fonts.ready.then(() => {
			const el = ref.current?.firstElementChild as HTMLElement | null;
			if (dead || !el) return;
			const r = el.getBoundingClientRect();
			const k = Math.min(
				(w * (1 - 2 * pad)) / r.width,
				(h * (1 - 2 * pad)) / r.height,
			);
			setSize(Math.floor(100 * k));
		});
		return () => {
			dead = true;
		};
	}, [w, h, pad]);
	return (
		<div ref={ref} className={b.plate} data-bg={q.bg ?? "dark"}>
			<Wordmark size={size} lay={lay} />
		</div>
	);
}

// ---------------------------------------------------------------- logo

/**
 * The logo: the Echo mask (Colombina), gilded with ember eyes, in the Fragment picker's
 * lit rose window. `bg=maskable` keeps everything inside the 80% safe circle.
 */
function Logo({ size, q }: { size: number; q: Q }) {
	const maskable = q.bg === "maskable";
	const aspect = num(q.aspect, 2);
	const rose = size * num(q.rose, maskable ? 0.78 : 0.92);
	const maskW = rose * num(q.mask, 0.74);
	return (
		<div
			className={b.logo}
			data-bg={q.bg ?? "dark"}
			style={{ width: size, height: size }}
		>
			<div
				className={b.logoRose}
				data-rose
				style={{ width: rose, height: rose }}
			>
				<RoseWindow
					aspect={aspect}
					style={{ position: "absolute", inset: 0 }}
				/>
				<span className={b.logoShade} />
				<span className={b.logoMask} data-mask style={{ width: maskW }}>
					<Mask aspect={aspect} size={Math.round(maskW)} glow />
				</span>
			</div>
		</div>
	);
}

/**
 * The logo as one flat SVG file: the same composition with the rose's own SVG art (the
 * shader's fallback, so no WebGL light), the stone ring and the mask, read from the DOM.
 * Writes the markup into #svgout; `show=1` paints the result over the page to check it.
 */
function LogoSvg({ size, q, ready }: { size: number; q: Q; ready: boolean }) {
	const ref = useRef<HTMLDivElement>(null);
	const [svg, setSvg] = useState("");
	useEffect(() => {
		if (!ready || !ref.current) return;
		const root = ref.current;
		const box = root.querySelector<HTMLElement>("[data-rose]");
		const maskEl = root.querySelector<HTMLElement>("[data-mask] svg");
		if (!box || !maskEl) return;
		const art = box.querySelector("clipPath")?.closest("svg");
		const stone = box.querySelector("#rw-stone")?.closest("svg");
		if (!art || !stone) return;
		const R = box.offsetWidth;
		const off = (size - R) / 2;
		const inner = (el: Element) => el.innerHTML;
		const m = maskEl.getBoundingClientRect();
		const r0 = root.getBoundingClientRect();
		const mvb = maskEl.getAttribute("viewBox") ?? "0 0 100 100";
		const f = (n: number) => n.toFixed(2);
		const out = [
			`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
			`<title>Apostasy: Sede Vacante</title>`,
			`<defs>`,
			`<radialGradient id="lg-bg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2a1d14"/><stop offset=".62" stop-color="#120c0a"/><stop offset="1" stop-color="#050403"/></radialGradient>`,
			`<radialGradient id="lg-shade" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b0807" stop-opacity=".82"/><stop offset=".58" stop-color="#0b0807" stop-opacity=".56"/><stop offset="1" stop-color="#0b0807" stop-opacity="0"/></radialGradient>`,
			`<filter id="lg-drop" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="${f(size * 0.012)}" stdDeviation="${f(size * 0.01)}" flood-color="#000" flood-opacity=".85"/></filter>`,
			`</defs>`,
			q.bg === "clear"
				? ""
				: `<rect width="${size}" height="${size}" fill="url(#lg-bg)"/>`,
			`<svg x="${f(off)}" y="${f(off)}" width="${R}" height="${R}" viewBox="0 0 200 200"><circle cx="100" cy="100" r="93" fill="#0b0807"/>${inner(art)}</svg>`,
			`<circle cx="${size / 2}" cy="${size / 2}" r="${f(R * 0.36)}" fill="url(#lg-shade)"/>`,
			`<svg x="${f(off)}" y="${f(off)}" width="${R}" height="${R}" viewBox="0 0 200 200" overflow="visible">${inner(stone)}</svg>`,
			`<g filter="url(#lg-drop)"><svg x="${f(m.left - r0.left)}" y="${f(m.top - r0.top)}" width="${f(m.width)}" height="${f(m.height)}" viewBox="${mvb}">${inner(maskEl)}</svg></g>`,
			`</svg>`,
		].join("");
		setSvg(out);
	}, [ready, size, q.bg]);
	return (
		<div ref={ref} style={{ position: "relative", width: size, height: size }}>
			<Logo size={size} q={q} />
			<textarea id="svgout" readOnly value={svg} hidden />
			{q.show && svg ? (
				// biome-ignore lint/performance/noImgElement: checking the generated file
				<img
					src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
					alt=""
					style={{ position: "absolute", inset: 0, background: "#000" }}
				/>
			) : null}
		</div>
	);
}

// ---------------------------------------------------------------- the ink stone

/** The title nave's ink stone as a backdrop image, centred on its window, at `scale`. */
function NaveBackdrop({
	w,
	h,
	scale,
	cx = 0.5,
	cy = 0.5,
	style,
}: {
	w: number;
	h: number;
	scale: number;
	/** Where the window's centre (stage x 195, y 232) lands, as a fraction of the box. */
	cx?: number;
	cy?: number;
	style?: CSSProperties;
}) {
	// Enough stone to cover the box at this scale.
	const bx = Math.ceil(w / scale / 2 / 40) * 40 + 40;
	const by = Math.ceil(h / scale / 2 / 40) * 40 + 40;
	const bleed = useMemo(() => ({ x: bx, y: by }), [bx, by]);
	const src = useMemo(() => svgURL(naveSVG(bleed)), [bleed]);
	const [x0, y0, vw, vh] = naveBox(bleed);
	const left = w * cx - (195 - x0) * scale;
	const top = h * cy - (232 - y0) * scale;
	return (
		// biome-ignore lint/performance/noImgElement: a generated SVG drawing
		<img
			className={b.nave}
			src={src}
			alt=""
			draggable={false}
			style={{ left, top, width: vw * scale, height: vh * scale, ...style }}
		/>
	);
}

// ---------------------------------------------------------------- cover

/** Wide face-off: two masked Fragments in lit arched windows, the name between them. */
function Cover({ w, h, q }: { w: number; h: number; q: Q }) {
	const winW = num(q.win, 148);
	const floor = num(q.floor, 274);
	const inset = num(q.inset, 84);
	const left = num(q.al, 2);
	const right = num(q.ar, 5);
	const winH = (winW * 420) / 300;
	return (
		<div className={b.cover} style={{ width: w, height: h }}>
			<NaveBackdrop
				w={w}
				h={h}
				scale={num(q.ns, 0.62)}
				cx={0.5}
				cy={num(q.ny, 0.36)}
				style={{ opacity: num(q.no, 0.55) }}
			/>
			<div className={b.coverPool} />
			<div
				className={b.coverWin}
				style={{ left: inset, top: floor - winH, width: winW }}
			>
				<GlassWindow aspect={left} width={winW} />
			</div>
			<div
				className={b.coverWin}
				style={{ right: inset, top: floor - winH, width: winW }}
			>
				<GlassWindow aspect={right} width={winW} />
			</div>
			<div className={b.coverMark} style={{ top: num(q.my, 0.47) * h }}>
				<Wordmark size={num(q.ms, 88)} lay="stack" />
			</div>
		</div>
	);
}

// ---------------------------------------------------------------- key art

/** The title nave with the wordmark struck over the floor. */
function KeyArt({ w, h, q }: { w: number; h: number; q: Q }) {
	return (
		<div className={b.key} style={{ width: w, height: h }}>
			<div className={b.keyScene}>
				<TitleScene />
			</div>
			{q.mark === "0" ? null : (
				<>
					<div className={b.keyPool} />
					<div className={b.keyMark} style={{ top: num(q.my, 0.745) * h }}>
						<Wordmark size={num(q.ms, 0.17) * h} lay="stack" />
					</div>
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------- mask row

function MaskRow({ q }: { q: Q }) {
	const size = num(q.size, 180);
	return (
		<div className={b.masks} data-bg={q.bg ?? "dark"}>
			{L.aspects.map((asp, i) => (
				<figure key={asp.key} className={b.maskCell}>
					<Mask aspect={i} size={size} glow />
					<figcaption>
						<span className={b.maskName}>{asp.mask}</span>
						<span className={b.maskAspect}>{asp.name}</span>
					</figcaption>
				</figure>
			))}
		</div>
	);
}

// ---------------------------------------------------------------- listing frame

/** A vertical listing card: one caption, the phone capture on the ink. */
function Frame({ w, h, q }: { w: number; h: number; q: Q }) {
	const phoneH = num(q.ph, 1440);
	const phoneW = (phoneH * 390) / 844;
	const shot = q.shot ?? "shot";
	return (
		<div className={b.frame} style={{ width: w, height: h }}>
			<NaveBackdrop
				w={w}
				h={h}
				scale={num(q.ns, 2.2)}
				cx={0.5}
				cy={num(q.ny, 0.36)}
				style={{ opacity: 0.32, filter: "blur(2px)" }}
			/>
			<div className={b.framePool} />
			<h2 className={b.caption} style={{ height: h - phoneH - 140 }}>
				<span>{q.cap ?? "Caption"}</span>
				<i className={b.capRule} aria-hidden="true" />
			</h2>
			<div className={b.phone} style={{ width: phoneW, height: phoneH }}>
				{/* biome-ignore lint/performance/noImgElement: a capture served by the capture script */}
				<img src={`/brandshot/${shot}.png`} alt="" />
			</div>
		</div>
	);
}
