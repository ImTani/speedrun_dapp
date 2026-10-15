// Stained-glass kit for the design mocks: seeded window art, glyphs, the tear deck, small motions.
(() => {
	const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const LEAD = "#0b0a10";

	function rng(seed) {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function jitter(hex, r, amt = 0.14) {
		const n = parseInt(hex.slice(1), 16);
		const k = 1 + (r() - 0.5) * 2 * amt;
		const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
			Math.max(0, Math.min(255, Math.round(v * k))),
		);
		return `rgb(${c.join(",")})`;
	}
	const pt = (cx, cy, r, a) =>
		`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
	function ringPiece(cx, cy, r0, r1, a0, a1) {
		const s = 3,
			out = [];
		for (let i = 0; i <= s; i++)
			out.push(pt(cx, cy, r1, a0 + ((a1 - a0) * i) / s));
		for (let i = s; i >= 0; i--)
			out.push(
				r0 === 0 ? `${cx},${cy}` : pt(cx, cy, r0, a0 + ((a1 - a0) * i) / s),
			);
		return out.join(" ");
	}

	const THEMES = {
		vesper: {
			cloak: ["#8e1530", "#6a0f25", "#b0213c"],
			hood: "#4a0b1c",
			sky: ["#1d3f8f", "#2a1e5c", "#16316f"],
			band: ["#4e2a7a", "#6d3aa3"],
			corona: ["#d9951f", "#a3172f"],
			sun: ["#f2c25a", "#e6a634"],
			ground: ["#176a4f", "#0f4f3a"],
			card: "#efe4cc",
		},
		hermit: {
			cloak: ["#2b3f72", "#1b2a52", "#3a5592"],
			hood: "#121c38",
			sky: ["#3a1340", "#22102e", "#4a1a4f"],
			band: ["#176a4f", "#1f8462"],
			corona: ["#8a8f9e", "#5d6272"],
			sun: ["#c9cfdb", "#a7aebd"],
			ground: ["#3a2a1c", "#2a1d12"],
			card: "#cfd4de",
		},
		vibora: {
			cloak: ["#176a4f", "#0f4f3a", "#1f8a63"],
			hood: "#0a3628",
			sky: ["#5a1a24", "#3d1018", "#6e2230"],
			band: ["#d9951f", "#b8771a"],
			corona: ["#f2c25a", "#e9b23a"],
			sun: ["#fbe3a0", "#f2c25a"],
			ground: ["#4e2a7a", "#3a1f5c"],
			card: "#efe4cc",
		},
		static: {
			cloak: ["#5d3a8f", "#43286b", "#7550ad"],
			hood: "#2c1a47",
			sky: ["#0f3b4a", "#0a2a36", "#14505f"],
			band: ["#a3172f", "#c2283f"],
			corona: ["#3fa9b8", "#2b8593"],
			sun: ["#d7f0f2", "#a9dfe4"],
			ground: ["#5c4a1c", "#47391a"],
			card: "#e6eef0",
		},
		marrow: {
			cloak: ["#5a4a3a", "#3f3428", "#73604c"],
			hood: "#2a221a",
			sky: ["#4a0f12", "#2e090c", "#5e1418"],
			band: ["#2a1e5c", "#3a2a7a"],
			corona: ["#b8924a", "#8a6a2e"],
			sun: ["#e9d6a8", "#d4bd86"],
			ground: ["#1d3f8f", "#16316f"],
			card: "#e9dcc0",
		},
	};

	/** Arched stained-glass window: radiant sky, hooded figure holding its card, ground. viewBox 300x420. */
	function windowSVG({
		theme = "vesper",
		seed = 7,
		reversed = false,
		id = "w" + Math.random().toString(36).slice(2, 7),
		width = 260,
		// "art" = finished SVG; "color" = panes + lead, no light or noise (the shader's albedo);
		// "lead" = white lead lines on transparent (the shader's came/bevel mask).
		mode = "art",
	} = {}) {
		const T = THEMES[theme],
			r = rng(seed),
			cx = 150,
			cy = 165,
			N = 16,
			pieces = [];
		const piece = (pts, fill) =>
			pieces.push(`<polygon points="${pts}" fill="${fill}"/>`);
		const step = (Math.PI * 2) / N,
			off = -Math.PI / 2;
		for (let i = 0; i < 8; i++)
			piece(
				ringPiece(cx, cy, 0, 50, off + i * step * 2, off + (i + 1) * step * 2),
				jitter(T.sun[i % 2], r, 0.06),
			);
		for (let i = 0; i < N; i++)
			piece(
				ringPiece(cx, cy, 50, 98, off + i * step, off + (i + 1) * step),
				jitter(T.corona[i % 2], r, 0.1),
			);
		for (let i = 0; i < N; i++)
			piece(
				ringPiece(cx, cy, 98, 162, off + i * step, off + (i + 1) * step),
				jitter(T.band[i % 2], r, 0.12),
			);
		for (let i = 0; i < N; i++)
			piece(
				ringPiece(cx, cy, 162, 360, off + i * step, off + (i + 1) * step),
				jitter(T.sky[i % 3], r, 0.16),
			);
		const fig = [
			[
				`0,420 0,372 60,358 122,368 180,358 240,366 300,354 300,420`,
				T.ground[0],
			],
			[`0,420 0,392 96,384 150,392 210,382 300,390 300,420`, T.ground[1]],
			[`60,420 92,300 112,310 98,420`, T.cloak[1]],
			[`98,420 112,310 150,300 150,420`, T.cloak[0]],
			[`150,420 150,300 188,310 202,420`, T.cloak[2]],
			[`202,420 188,310 208,300 240,420`, T.cloak[1]],
			[
				`92,300 105,272 150,262 195,272 208,300 188,310 150,300 112,310`,
				T.cloak[0],
			],
		].map(([p, c]) => `<polygon points="${p}" fill="${jitter(c, r, 0.05)}"/>`);
		const hood = `<path d="M150 178 Q122 196 114 240 Q112 262 124 276 L176 276 Q188 262 186 240 Q178 196 150 178Z" fill="${T.hood}"/>`;
		// Face sunk in the hood's shadow: dark glass, two lit eye panes, a lit chin.
		const face = `<ellipse cx="150" cy="244" rx="16" ry="21" fill="#140810"/><path d="M137 241 L147 236 L146 244Z" fill="${T.sun[0]}"/><path d="M163 241 L153 236 L154 244Z" fill="${T.sun[0]}"/>`;
		const held = `<rect x="136" y="300" width="28" height="42" rx="2" fill="${T.card}"/><polygon points="150,309 153,318 162,321 153,324 150,333 147,324 138,321 147,318" fill="${T.sun[1]}"/><circle cx="133" cy="321" r="5" fill="${T.card}"/><circle cx="167" cy="321" r="5" fill="${T.card}"/>`;
		const arch = "M0 420 V150 A150 150 0 0 1 300 150 V420 Z";
		if (mode !== "art") {
			// "glow" = panes only, no lead (blurred by the caller into the shader's bloom source).
			const lead = mode === "lead";
			const shapes = `${pieces.join("")}${fig.join("")}${hood}${face}${held}`;
			const inner = lead
				? `<rect width="300" height="420" fill="#000"/><g stroke="#fff" stroke-width="4" stroke-linejoin="round">${shapes.replace(/fill="[^"]*"/g, 'fill="#000"')}</g><path d="${arch}" fill="none" stroke="#fff" stroke-width="12"/>`
				: mode === "glow"
					? `<g>${shapes}</g>`
					: `<g stroke="${LEAD}" stroke-width="3.5" stroke-linejoin="round">${shapes}</g><path d="${arch}" fill="none" stroke="${LEAD}" stroke-width="10"/>`;
			const flat = `<defs><clipPath id="${id}c"><path d="${arch}"/></clipPath></defs><g clip-path="url(#${id}c)">${inner}</g>`;
			const hh = Math.round((width * 420) / 300);
			return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${hh}" viewBox="0 0 300 420">${reversed ? `<g transform="rotate(180 150 210)">${flat}</g>` : flat}</svg>`;
		}
		const body = `
		<defs>
			<clipPath id="${id}c"><path d="${arch}"/></clipPath>
			<radialGradient id="${id}l" gradientUnits="userSpaceOnUse" cx="150" cy="165" r="240">
				<stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
				${reduce ? "" : `<animate attributeName="cx" values="138;164;138" dur="11s" repeatCount="indefinite"/><animate attributeName="cy" values="160;176;160" dur="13s" repeatCount="indefinite"/>`}
			</radialGradient>
			<filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter>
		</defs>
		<g clip-path="url(#${id}c)">
			<g stroke="${LEAD}" stroke-width="3.5" stroke-linejoin="round">${pieces.join("")}${fig.join("")}${hood}${face}${held}</g>
			<rect width="300" height="420" fill="url(#${id}l)" style="mix-blend-mode:screen"/>
			<rect width="300" height="420" filter="url(#${id}n)" opacity=".16" style="mix-blend-mode:overlay"/>
		</g>
		<path d="${arch}" fill="none" stroke="${LEAD}" stroke-width="10"/>
		<path d="${arch}" fill="none" stroke="#b8924a" stroke-width="2" transform="translate(150 210) scale(.955) translate(-150 -210)"/>`;
		const h = Math.round((width * 420) / 300);
		return `<svg class="win" width="${width}" height="${h}" viewBox="0 0 300 420" aria-hidden="true">${reversed ? `<g transform="rotate(180 150 210)">${body}</g>` : body}</svg>`;
	}

	/** Two-halved medallion: left = our hero, right = the opponent. Lit half kept faith; dark cracked half betrayed. */
	function medallion(heroKept, oppKept, size = 64) {
		const half = (side, kept) => {
			const d =
				side === "l"
					? "M32 4 A28 28 0 0 0 32 60 Z"
					: "M32 4 A28 28 0 0 1 32 60 Z";
			const fill = kept ? (side === "l" ? "#e6a634" : "#f2c25a") : "#3a0d18";
			const crack = kept
				? ""
				: side === "l"
					? `<path d="M14 18 L22 28 L15 36 L24 46" fill="none" stroke="#0b0a10" stroke-width="2"/>`
					: `<path d="M50 16 L41 27 L49 35 L40 47" fill="none" stroke="#0b0a10" stroke-width="2"/>`;
			return `<path d="${d}" fill="${fill}" stroke="#0b0a10" stroke-width="3"/>${crack}`;
		};
		return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#b8924a"/>${half("l", heroKept)}${half("r", oppKept)}<circle cx="32" cy="32" r="28" fill="none" stroke="#0b0a10" stroke-width="3"/></svg>`;
	}

	const GLYPHS = {
		// Fragment: your arched window.
		fragment: `<path d="M5 22 V10 A7 7 0 0 1 19 10 V22 Z" fill="#a3172f"/><path d="M5 22 V16 L12 13 L19 16 V22Z" fill="#6a0f25"/><circle cx="12" cy="10" r="3" fill="#f2c25a"/>`,
		// Spire: the climb.
		spire: `<path d="M8 22 V10 L12 2 L16 10 V22 Z" fill="#4e2a7a"/><path d="M10.6 22 V17.5 A1.4 1.4 0 0 1 13.4 17.5 V22Z" fill="#f2c25a"/><path d="M10.8 11.5 h2.4 v3 h-2.4z" fill="#d9951f"/>`,
		// Gathering: the mask worn to it.
		gathering: `<path d="M3.5 8 Q12 4.5 20.5 8 Q20.5 16.5 12 20.5 Q3.5 16.5 3.5 8Z" fill="#efe4cc"/><path d="M6.5 10.5 Q8.5 9 10.5 10.8 Q8.5 12 6.5 10.5Z" fill="#0b0a10"/><path d="M17.5 10.5 Q15.5 9 13.5 10.8 Q15.5 12 17.5 10.5Z" fill="#0b0a10"/><path d="M12 13 V16" fill="none"/>`,
		// Reliquary: the casket you scry from.
		reliquary: `<path d="M5 11 L12 5 L19 11 Z" fill="#b8924a"/><rect x="5" y="11" width="14" height="10" fill="#d9951f"/><path d="M10 21 V15.5 A2 2 0 0 1 14 15.5 V21Z" fill="#4e2a7a"/>`,
		// Vestry: a vestment on its hook.
		vestry: `<path d="M12 3 V6" fill="none"/><path d="M7 7 H17 L19 21 H5 Z" fill="#a3172f"/><path d="M10 7 H14 L13 21 H11 Z" fill="#f2c25a"/>`,
	};
	// Earlier mocks used these keys.
	Object.assign(GLYPHS, {
		vesper: GLYPHS.fragment,
		tower: GLYPHS.spire,
		sitting: GLYPHS.gathering,
		draw: GLYPHS.reliquary,
		curios: GLYPHS.vestry,
	});
	const glyph = (name, s = 28) =>
		`<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#0b0a10" stroke-width="1.6" stroke-linejoin="round">${GLYPHS[name]}</g></svg>`;
	const upArrow = `<svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M6 1 L11 7 H8 V13 H4 V7 H1 Z" fill="#dcb874" stroke="#0b0a10" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

	// Locked vocabulary (world pass, 2026-10-15). Icon first, label second.
	const TABS = [
		["fragment", "Fragment"],
		["spire", "Spire"],
		["gathering", "Gathering"],
		["reliquary", "Reliquary"],
		["vestry", "Vestry"],
	];
	const OLD_TAB = {
		vesper: "fragment",
		tower: "spire",
		sitting: "gathering",
		draw: "reliquary",
		curios: "vestry",
	};
	function tabbar(active = "fragment") {
		active = OLD_TAB[active] ?? active;
		return `<nav class="tabs">${TABS.map(([k, l]) => `<div class="tab${k === active ? " on" : ""}" data-tab="${k}">${glyph(k, 32)}<span>${l}</span></div>`).join("")}</nav>`;
	}

	const READINGS = [
		{
			day: "The 11th · morning Gathering",
			opp: "The Iron Hermit",
			theme: "hermit",
			hero: true,
			them: false,
			what: "Vesper kindled. The Iron Hermit devoured.",
			pts: 0,
		},
		{
			day: "The 12th · evening Gathering",
			opp: "La Víbora",
			theme: "vibora",
			hero: true,
			them: true,
			what: "Both kindled, five turns running.",
			pts: 15,
		},
		{
			day: "The 13th · evening Gathering",
			opp: "Doc Static",
			theme: "static",
			hero: true,
			them: true,
			what: "One devouring, forgiven. Both burned brighter.",
			pts: 9,
		},
		{
			day: "The 14th · evening Gathering",
			opp: "Old Marrow",
			theme: "marrow",
			hero: false,
			them: false,
			what: "Old Marrow devoured first. Vesper answered, twice.",
			pts: 5,
		},
	];

	function slipHTML(r, left) {
		return `<div class="perf"></div><div class="row">${medallion(r.hero, r.them)}<div><div class="when">${r.day}</div><div class="who">Vesper met ${r.opp}</div></div></div>
		<div class="what">${r.what}</div>
		<div class="foot"><span class="pts">+${r.pts}</span><span class="hint">${upArrow} Tear away · ${left} left</span></div>`;
	}

	function press(root = document) {
		root.querySelectorAll(".pane-btn, .tab, [data-press]").forEach((b) => {
			b.addEventListener("pointerdown", () => b.classList.add("pressed"));
			["pointerup", "pointercancel", "pointerleave"].forEach((e) =>
				b.addEventListener(e, () => b.classList.remove("pressed")),
			);
		});
	}

	function tabs(root = document) {
		const all = [...root.querySelectorAll(".tab")];
		all.forEach((t) =>
			t.addEventListener("click", () => {
				all.forEach((x) => x.classList.remove("on", "lit"));
				t.classList.add("on");
				void t.offsetWidth;
				t.classList.add("lit");
			}),
		);
	}

	/** Drag a slip upward past the threshold (or tap it) to tear it away. */
	function tearable(el, onTorn) {
		let y0 = null,
			x0 = 0,
			dy = 0,
			dx = 0,
			moved = false;
		el.addEventListener("pointerdown", (e) => {
			y0 = e.clientY;
			x0 = e.clientX;
			dy = dx = 0;
			moved = false;
			el.setPointerCapture(e.pointerId);
			el.style.transition = "none";
		});
		el.addEventListener("pointermove", (e) => {
			if (y0 === null) return;
			dy = Math.min(0, e.clientY - y0);
			dx = e.clientX - x0;
			if (Math.abs(dy) > 6) moved = true;
			el.style.transform = `translateY(${dy * 0.9}px) rotate(${(dy / 36) * (dx > 0 ? -1 : 1)}deg)`;
		});
		el.addEventListener("pointerup", () => {
			if (y0 === null) return;
			y0 = null;
			if (!moved || dy < -80) {
				const cur = getComputedStyle(el).transform;
				el.animate(
					[
						{ transform: cur === "none" ? "none" : cur },
						{
							transform: `translate(${(dx / 100) * 40 + 30}px,-520px) rotate(${-16 + dx / 10}deg)`,
							opacity: 0.15,
						},
					],
					{
						duration: reduce ? 1 : 520,
						easing: "cubic-bezier(.5,0,.75,0)",
						fill: "forwards",
					},
				).onfinish = onTorn;
			} else {
				el.style.transition = "transform .4s cubic-bezier(.3,1.5,.5,1)";
				el.style.transform = "none";
			}
		});
	}

	function countUp(el, from, to, ms = 700) {
		const fmt = (n) => n.toLocaleString("en-US");
		if (reduce) {
			el.textContent = fmt(to);
			return;
		}
		const t0 = performance.now();
		(function f(t) {
			const p = Math.min(1, (t - t0) / ms),
				e = 1 - (1 - p) ** 3;
			el.textContent = fmt(Math.round(from + (to - from) * e));
			if (p < 1) requestAnimationFrame(f);
			else {
				el.classList.remove("bump");
				void el.offsetWidth;
				el.classList.add("bump");
			}
		})(t0);
	}

	/** Small lit glass diamonds flying from one element to another. */
	function motes(fromEl, toEl, n = 7) {
		const a = fromEl.getBoundingClientRect(),
			b = toEl.getBoundingClientRect();
		for (let k = 0; k < n; k++) {
			const m = document.createElement("div");
			m.className = "mote";
			m.style.left = a.left + a.width / 2 + "px";
			m.style.top = a.top + a.height / 2 + "px";
			document.body.appendChild(m);
			const mx = (k - n / 2) * 18;
			m.animate(
				[
					{ transform: "translate(0,0) rotate(45deg) scale(.6)" },
					{
						transform: `translate(${mx}px,-70px) rotate(135deg) scale(1.1)`,
						offset: 0.35,
					},
					{
						transform: `translate(${b.left - a.left - a.width / 2 + b.width / 2}px,${b.top - a.top - a.height / 2 + b.height / 2}px) rotate(225deg) scale(.5)`,
						opacity: 0.4,
					},
				],
				{
					duration: reduce ? 1 : 900,
					easing: "cubic-bezier(.45,0,.2,1)",
					delay: reduce ? 0 : k * 55,
				},
			).onfinish = () => m.remove();
		}
	}

	function swell(el) {
		el.classList.remove("swell");
		void el.offsetWidth;
		el.classList.add("swell");
	}

	window.G = {
		windowSVG,
		medallion,
		glyph,
		upArrow,
		tabbar,
		READINGS,
		slipHTML,
		press,
		tabs,
		tearable,
		countUp,
		motes,
		swell,
		reduce,
	};
})();
