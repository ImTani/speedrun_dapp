// The seven Aspect masks, Venetian carnival forms drawn in SVG (viewBox 0 0 100 84).
// Mercy=Volto, Hunger=Bauta, Echo=Colombina (mirrored), Rancour=Pantalone, Appetite=Arlecchino,
// Inquisitor=Medico della Peste, Madness=Jolly. Paid "mask skins" later swap the material, not the form.
(() => {
	const INK = "#0b0a10", GOLD = "#c9a24e", GOLD_D = "#8a6a2e", BONE = "#f1e9da", BONE_D = "#d9ccb6";
	const eye = (x, y, w = 15, h = 7, tilt = 0) =>
		`<path d="M${x - w / 2} ${y} Q${x} ${y - h - tilt} ${x + w / 2} ${y} Q${x} ${y + h * 0.55} ${x - w / 2} ${y}Z" fill="${INK}"/>`;
	const curl = (x, y, s = 1, flip = 1) =>
		`<path d="M${x} ${y} q${4 * s * flip} ${-6 * s} ${9 * s * flip} ${-2 * s} q${3 * s * flip} ${3 * s} ${-1 * s * flip} ${5 * s}" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/>`;

	const MASKS = {
		mercy: `
			<path d="M50 3 C75 3 89 22 89 44 C89 65 72 81 50 81 C28 81 11 65 11 44 C11 22 25 3 50 3Z" fill="${BONE}" stroke="${GOLD}" stroke-width="2.4"/>
			<path d="M50 3 C64 3 74 10 80 20 C70 13 60 10 50 10 C40 10 30 13 20 20 C26 10 36 3 50 3Z" fill="${BONE_D}"/>
			${eye(34, 39, 16, 6)}${eye(66, 39, 16, 6)}
			<path d="M50 41 L46.5 56 Q50 58.5 53.5 56 Z" fill="${BONE_D}"/>
			<path d="M41 66 Q50 62 59 66 Q50 69.5 41 66Z" fill="#c4b19a"/>
			${curl(15, 40, 1, 1)}${curl(85, 40, 1, -1)}
			<circle cx="50" cy="16" r="2.4" fill="${GOLD}"/>`,
		hunger: `
			<path d="M20 9 Q50 -1 80 9 Q90 28 85 50 L88 74 Q50 86 12 74 L15 50 Q10 28 20 9Z" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="2"/>
			<path d="M22 54 L78 54 L87 74 Q50 86 13 74Z" fill="${GOLD_D}"/>
			<path d="M28 54 Q50 49 72 54" fill="none" stroke="${INK}" stroke-width="1.6"/>
			${eye(34, 34, 15, 7)}${eye(66, 34, 15, 7)}
			<path d="M50 34 L45 50 L55 50Z" fill="#a8813a"/>
			<path d="M24 20 Q50 12 76 20" fill="none" stroke="#e8cf86" stroke-width="1.4"/>`,
		echo: `
			<defs><clipPath id="echoL"><rect x="0" y="0" width="50" height="84"/></clipPath><clipPath id="echoR"><rect x="50" y="0" width="50" height="84"/></clipPath></defs>
			<path id="echoShape" d="M7 36 Q17 19 50 23 Q83 19 93 36 Q89 53 70 55 Q58 55 50 48 Q42 55 30 55 Q11 53 7 36Z" fill="${GOLD}" clip-path="url(#echoL)"/>
			<path d="M7 36 Q17 19 50 23 Q83 19 93 36 Q89 53 70 55 Q58 55 50 48 Q42 55 30 55 Q11 53 7 36Z" fill="#c9ccd4" clip-path="url(#echoR)"/>
			<path d="M7 36 Q17 19 50 23 Q83 19 93 36 Q89 53 70 55 Q58 55 50 48 Q42 55 30 55 Q11 53 7 36Z" fill="none" stroke="${INK}" stroke-width="1.6"/>
			<path d="M50 23 V48" stroke="${INK}" stroke-width="1.2"/>
			${eye(31, 38, 16, 7)}${eye(69, 38, 16, 7)}
			<path d="M22 22 L16 6 L27 19 L30 3 L35 20" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linejoin="round"/>
			<path d="M78 22 L84 6 L73 19 L70 3 L65 20" fill="none" stroke="#c9ccd4" stroke-width="2" stroke-linejoin="round"/>`,
		rancour: `
			<path d="M9 31 Q29 15 50 19 Q71 15 91 31 Q87 49 67 51 Q57 52 50 57 Q43 52 33 51 Q13 49 9 31Z" fill="#6b3b2a" stroke="${INK}" stroke-width="1.8"/>
			<path d="M47 33 Q43 44 45 55 Q52 57 57 51 Q53 50 52.5 44 Q52 37 54 33Z" fill="#4a2719" stroke="#0b0a10" stroke-width="1.2"/>
			${eye(31, 35, 14, 5)}${eye(69, 35, 14, 5)}
			<path d="M18 24 L42 31" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
			<path d="M82 24 L58 31" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
			<path d="M30 43 Q36 46 42 44 M70 43 Q64 46 58 44" fill="none" stroke="#4a2719" stroke-width="1.4"/>`,
		appetite: `
			<defs><clipPath id="harl"><path d="M8 33 Q30 21 50 25 Q70 21 92 33 Q86 51 64 51 Q56 51 50 45 Q44 51 36 51 Q14 51 8 33Z"/></clipPath></defs>
			<path d="M8 33 Q30 21 50 25 Q70 21 92 33 Q86 51 64 51 Q56 51 50 45 Q44 51 36 51 Q14 51 8 33Z" fill="#1a1418"/>
			<g clip-path="url(#harl)" opacity=".9">
				<path d="M10 26 L20 36 L10 46 L0 36Z M30 22 L40 32 L30 42 L20 32Z M70 22 L80 32 L70 42 L60 32Z M90 26 L100 36 L90 46 L80 36Z" fill="#a3172f"/>
				<path d="M20 36 L30 46 L20 56 L10 46Z M80 36 L90 46 L80 56 L70 46Z M50 20 L58 28 L50 36 L42 28Z" fill="#176a4f"/>
				<path d="M40 32 L50 42 L40 52 L30 42Z M60 32 L70 42 L60 52 L50 42Z" fill="#d9951f"/>
			</g>
			<path d="M8 33 Q30 21 50 25 Q70 21 92 33 Q86 51 64 51 Q56 51 50 45 Q44 51 36 51 Q14 51 8 33Z" fill="none" stroke="${INK}" stroke-width="1.8"/>
			${eye(32, 37, 12, 6)}${eye(68, 37, 12, 6)}
			<circle cx="50" cy="26" r="3.2" fill="#1a1418" stroke="${INK}" stroke-width="1"/>`,
		inquisitor: `
			<path d="M20 8 Q50 -2 80 8 Q90 26 78 42 L60 46 L40 46 L22 42 Q10 26 20 8Z" fill="#f1e9da" stroke="${INK}" stroke-width="1.8"/>
			<path d="M38 42 Q50 38 62 42 L53 82 Q50 85 47 82Z" fill="#e2d6bf" stroke="${INK}" stroke-width="1.8"/>
			<path d="M50 44 V80" stroke="#b9a98d" stroke-width="1.2"/>
			<circle cx="33" cy="27" r="10" fill="#7a5a2e"/><circle cx="67" cy="27" r="10" fill="#7a5a2e"/>
			<circle cx="33" cy="27" r="7" fill="#1d3f8f"/><circle cx="67" cy="27" r="7" fill="#1d3f8f"/>
			<path d="M29 23 Q31 21 34 22" stroke="#cfe0ff" stroke-width="1.6" fill="none"/><path d="M63 23 Q65 21 68 22" stroke="#cfe0ff" stroke-width="1.6" fill="none"/>
			<path d="M43 27 H57" stroke="#7a5a2e" stroke-width="2.4"/>`,
		madness: `
			<path d="M14 26 L4 4 L28 18 L50 0 L72 18 L96 4 L86 26Z" fill="#4e2a7a" stroke="${INK}" stroke-width="1.6"/>
			<path d="M14 26 L4 4 L28 18 L50 0 L50 26Z" fill="#a3172f"/>
			<circle cx="4" cy="4" r="3.6" fill="${GOLD}"/><circle cx="50" cy="1" r="3.6" fill="${GOLD}"/><circle cx="96" cy="4" r="3.6" fill="${GOLD}"/>
			<path d="M16 26 Q50 20 84 26 Q90 52 72 72 Q50 84 28 72 Q10 52 16 26Z" fill="${BONE}" stroke="${INK}" stroke-width="1.8"/>
			<path d="M16 26 Q50 20 84 26 L16 62Z" fill="#e7dccb"/>
			<circle cx="34" cy="42" r="8" fill="${INK}"/>${eye(68, 44, 14, 3)}
			<path d="M28 60 Q44 74 60 62 Q70 56 76 60" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
			<path d="M38 66 l2 4 M46 68 l1 4 M54 66 l0 4" stroke="${INK}" stroke-width="1.6"/>`,
	};
	const ASPECTS = {
		mercy: "Mercy", hunger: "Hunger", echo: "Echo", rancour: "Rancour", appetite: "Appetite", inquisitor: "Inquisitor", madness: "Madness",
	};
	let n = 0;
	/** An Aspect mask as SVG. Clip ids are suffixed so several masks can share a page. */
	function mask(aspect, width = 60) {
		const id = ++n;
		const body = MASKS[aspect].replace(/id="(\w+)"/g, `id="$1${id}"`).replace(/url\(#(\w+)\)/g, `url(#$1${id})`);
		return `<svg class="mask" width="${width}" height="${Math.round((width * 84) / 100)}" viewBox="0 0 100 84" aria-hidden="true">${body}</svg>`;
	}
	window.MASK = { mask, ASPECTS };
})();
