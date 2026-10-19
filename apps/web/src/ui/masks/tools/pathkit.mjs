// Tiny SVG path toolkit for the mask build (no dependencies).
// Parses path data, converts to absolute commands, splits subpaths, applies a
// similarity transform (uniform scale + translate), and measures points.

const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/** Parse path data into absolute segments: [{c, a:number[]}], H/V become L. */
export function parse(d) {
	const toks =
		d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ??
		[];
	const out = [];
	let i = 0,
		cmd = "",
		x = 0,
		y = 0,
		sx = 0,
		sy = 0;
	const num = () => Number.parseFloat(toks[i++]);
	while (i < toks.length) {
		if (/[a-z]/i.test(toks[i])) cmd = toks[i++];
		const up = cmd.toUpperCase(),
			rel = cmd !== up;
		if (up === "Z") {
			out.push({ c: "Z", a: [] });
			x = sx;
			y = sy;
			continue;
		}
		const n = ARGS[up];
		const a = [];
		for (let k = 0; k < n; k++) a.push(num());
		if (up === "H") {
			const nx = rel ? x + a[0] : a[0];
			out.push({ c: "L", a: [nx, y] });
			x = nx;
		} else if (up === "V") {
			const ny = rel ? y + a[0] : a[0];
			out.push({ c: "L", a: [x, ny] });
			y = ny;
		} else if (up === "A") {
			const ex = rel ? x + a[5] : a[5],
				ey = rel ? y + a[6] : a[6];
			out.push({ c: "A", a: [a[0], a[1], a[2], a[3], a[4], ex, ey] });
			x = ex;
			y = ey;
		} else {
			for (let k = 0; k < n; k += 2) {
				if (rel) {
					a[k] += x;
					a[k + 1] += y;
				}
			}
			out.push({ c: up, a });
			x = a[n - 2];
			y = a[n - 1];
			if (up === "M") {
				sx = x;
				sy = y;
				cmd = rel ? "l" : "L"; // implicit lineto after moveto
			}
		}
	}
	return out;
}

/** Split absolute segments into subpaths (each starts with M). */
export function split(segs) {
	const subs = [];
	for (const s of segs) {
		if (s.c === "M" || subs.length === 0) subs.push([]);
		subs[subs.length - 1].push(s);
	}
	return subs;
}

/** Uniform scale s about origin, then translate (tx, ty). Optional mirror in x about mx. */
export function transform(segs, s, tx, ty, mirrorX = null) {
	const X = (v) => {
		const r = v * s + tx;
		return mirrorX === null ? r : 2 * mirrorX - r;
	};
	const Y = (v) => v * s + ty;
	return segs.map(({ c, a }) => {
		if (c === "Z") return { c, a: [] };
		if (c === "A") {
			const sweep = mirrorX === null ? a[4] : 1 - a[4];
			return {
				c,
				a: [a[0] * s, a[1] * s, a[2], a[3], sweep, X(a[5]), Y(a[6])],
			};
		}
		return { c, a: a.map((v, k) => (k % 2 ? Y(v) : X(v))) };
	});
}

const f = (v) => {
	const r = Math.round(v * 100) / 100;
	return Object.is(r, -0) ? "0" : String(r);
};

/** Serialise absolute segments compactly. */
export function stringify(segs) {
	return segs
		.map(({ c, a }) => c + a.map(f).join(" "))
		.join("")
		.replace(/ -/g, "-");
}

/** On-curve end points of segments (good enough for centroids and bounds). */
export function points(segs) {
	const p = [];
	for (const { c, a } of segs) {
		if (c === "Z") continue;
		if (c === "C" || c === "S" || c === "Q") {
			for (let k = 0; k < a.length; k += 2) p.push([a[k], a[k + 1]]);
		} else p.push([a[a.length - 2], a[a.length - 1]]);
	}
	return p;
}

export function bbox(segs) {
	const p = points(segs);
	const xs = p.map((q) => q[0]),
		ys = p.map((q) => q[1]);
	return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function center(segs) {
	const [a, b, c, d] = bbox(segs);
	return [(a + c) / 2, (b + d) / 2];
}

/** A full circle as two arcs. */
export function circlePath(cx, cy, r) {
	return `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}Z`;
}
