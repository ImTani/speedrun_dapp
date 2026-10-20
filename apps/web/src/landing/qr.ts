/**
 * A small QR Code encoder (ISO/IEC 18004): byte mode, versions 1-10, any error-correction level,
 * all eight masks scored by the standard penalty rules. Enough for a short URL on the landing page;
 * runs on the server, so the page ships a plain SVG path and no encoder.
 *
 *   const m = qrMatrix("https://example.com/play"); // m[y][x] === true is a dark module
 *   const d = qrPath(m);                              // one SVG path, 1 unit per module
 *
 * Follows the structure of Project Nayuki's reference encoder (MIT).
 */

export type Ecl = "L" | "M" | "Q" | "H";

const MAX_VERSION = 10;
// Index 0 unused; versions 1-10.
const ECC_PER_BLOCK: Record<Ecl, readonly number[]> = {
	L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
	M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
	Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
	H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
};
const NUM_BLOCKS: Record<Ecl, readonly number[]> = {
	L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
	M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
	Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
	H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
};
const FORMAT_BITS: Record<Ecl, number> = { L: 1, M: 0, Q: 3, H: 2 };

const at = (a: readonly number[], i: number): number => a[i] ?? 0;
const bit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

function rawDataModules(ver: number): number {
	let r = (16 * ver + 128) * ver + 64;
	if (ver >= 2) {
		const n = Math.floor(ver / 7) + 2;
		r -= (25 * n - 10) * n - 55;
		if (ver >= 7) r -= 36;
	}
	return r;
}

function dataCodewords(ver: number, ecl: Ecl): number {
	return (
		Math.floor(rawDataModules(ver) / 8) -
		at(ECC_PER_BLOCK[ecl], ver) * at(NUM_BLOCKS[ecl], ver)
	);
}

// ---- Reed-Solomon over GF(2^8), polynomial 0x11D ----
function gfMul(x: number, y: number): number {
	let z = 0;
	for (let i = 7; i >= 0; i--) {
		z = (z << 1) ^ ((z >>> 7) * 0x11d);
		z ^= ((y >>> i) & 1) * x;
	}
	return z & 0xff;
}

function rsDivisor(degree: number): number[] {
	const r = new Array<number>(degree).fill(0);
	r[degree - 1] = 1;
	let root = 1;
	for (let i = 0; i < degree; i++) {
		for (let j = 0; j < r.length; j++) {
			r[j] = gfMul(at(r, j), root);
			if (j + 1 < r.length) r[j] = at(r, j) ^ at(r, j + 1);
		}
		root = gfMul(root, 0x02);
	}
	return r;
}

function rsRemainder(
	data: readonly number[],
	div: readonly number[],
): number[] {
	const r = new Array<number>(div.length).fill(0);
	for (const b of data) {
		const factor = b ^ (r.shift() ?? 0);
		r.push(0);
		for (let i = 0; i < div.length; i++)
			r[i] = at(r, i) ^ gfMul(at(div, i), factor);
	}
	return r;
}

// ---- Matrix ----
class Grid {
	readonly size: number;
	readonly dark: boolean[][];
	readonly fixed: boolean[][];
	readonly ver: number;
	constructor(ver: number) {
		this.ver = ver;
		this.size = ver * 4 + 17;
		this.dark = Array.from({ length: this.size }, () =>
			new Array<boolean>(this.size).fill(false),
		);
		this.fixed = Array.from({ length: this.size }, () =>
			new Array<boolean>(this.size).fill(false),
		);
	}
	get(x: number, y: number): boolean {
		return this.dark[y]?.[x] ?? false;
	}
	set(x: number, y: number, v: boolean): void {
		const row = this.dark[y];
		if (row) row[x] = v;
	}
	fn(x: number, y: number, v: boolean): void {
		this.set(x, y, v);
		const row = this.fixed[y];
		if (row) row[x] = true;
	}
	isFixed(x: number, y: number): boolean {
		return this.fixed[y]?.[x] ?? false;
	}
}

function alignmentPositions(ver: number): number[] {
	if (ver === 1) return [];
	const n = Math.floor(ver / 7) + 2;
	const step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
	const out = [6];
	for (let pos = ver * 4 + 17 - 7; out.length < n; pos -= step)
		out.splice(1, 0, pos);
	return out;
}

function drawFormat(g: Grid, ecl: Ecl, mask: number): void {
	const data = (FORMAT_BITS[ecl] << 3) | mask;
	let rem = data;
	for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
	const bits = ((data << 10) | rem) ^ 0x5412;
	const n = g.size;
	// Around the top-left finder.
	for (let i = 0; i <= 5; i++) g.fn(8, i, bit(bits, i));
	g.fn(8, 7, bit(bits, 6));
	g.fn(8, 8, bit(bits, 7));
	g.fn(7, 8, bit(bits, 8));
	for (let i = 9; i < 15; i++) g.fn(14 - i, 8, bit(bits, i));
	// The second copy, split between the other two finders.
	for (let i = 0; i < 8; i++) g.fn(n - 1 - i, 8, bit(bits, i));
	for (let i = 8; i < 15; i++) g.fn(8, n - 15 + i, bit(bits, i));
	g.fn(8, n - 8, true); // the dark module
}

function drawVersion(g: Grid): void {
	if (g.ver < 7) return;
	let rem = g.ver;
	for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
	const bits = (g.ver << 12) | rem;
	for (let i = 0; i < 18; i++) {
		const v = bit(bits, i);
		const a = g.size - 11 + (i % 3);
		const b = Math.floor(i / 3);
		g.fn(a, b, v);
		g.fn(b, a, v);
	}
}

function drawFunctionPatterns(g: Grid, ecl: Ecl): void {
	const n = g.size;
	for (let i = 0; i < n; i++) {
		g.fn(6, i, i % 2 === 0);
		g.fn(i, 6, i % 2 === 0);
	}
	for (const [cx, cy] of [
		[3, 3],
		[n - 4, 3],
		[3, n - 4],
	] as const) {
		for (let dy = -4; dy <= 4; dy++)
			for (let dx = -4; dx <= 4; dx++) {
				const d = Math.max(Math.abs(dx), Math.abs(dy));
				const x = cx + dx;
				const y = cy + dy;
				if (x >= 0 && x < n && y >= 0 && y < n) g.fn(x, y, d !== 2 && d !== 4);
			}
	}
	const pos = alignmentPositions(g.ver);
	const k = pos.length;
	for (let i = 0; i < k; i++)
		for (let j = 0; j < k; j++) {
			if (
				(i === 0 && j === 0) ||
				(i === 0 && j === k - 1) ||
				(i === k - 1 && j === 0)
			)
				continue;
			for (let dy = -2; dy <= 2; dy++)
				for (let dx = -2; dx <= 2; dx++)
					g.fn(
						at(pos, i) + dx,
						at(pos, j) + dy,
						Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
					);
		}
	drawFormat(g, ecl, 0); // reserved now, written for real once the mask is chosen
	drawVersion(g);
}

function drawCodewords(g: Grid, data: readonly number[]): void {
	const n = g.size;
	let i = 0;
	for (let right = n - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5;
		for (let vert = 0; vert < n; vert++)
			for (let j = 0; j < 2; j++) {
				const x = right - j;
				const upward = ((right + 1) & 2) === 0;
				const y = upward ? n - 1 - vert : vert;
				if (!g.isFixed(x, y) && i < data.length * 8) {
					g.set(x, y, bit(at(data, i >>> 3), 7 - (i & 7)));
					i++;
				}
			}
	}
}

function maskHit(mask: number, x: number, y: number): boolean {
	switch (mask) {
		case 0:
			return (x + y) % 2 === 0;
		case 1:
			return y % 2 === 0;
		case 2:
			return x % 3 === 0;
		case 3:
			return (x + y) % 3 === 0;
		case 4:
			return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
		case 5:
			return ((x * y) % 2) + ((x * y) % 3) === 0;
		case 6:
			return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
		default:
			return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
	}
}

function applyMask(g: Grid, mask: number): void {
	for (let y = 0; y < g.size; y++)
		for (let x = 0; x < g.size; x++)
			if (!g.isFixed(x, y) && maskHit(mask, x, y)) g.set(x, y, !g.get(x, y));
}

/** The standard penalty score (rules N1-N4); lower is easier to scan. */
function penalty(g: Grid): number {
	const n = g.size;
	let score = 0;
	const lines: boolean[][] = [];
	for (let y = 0; y < n; y++) lines.push(g.dark[y] ?? []);
	for (let x = 0; x < n; x++) lines.push(g.dark.map((row) => row[x] ?? false));
	const finderLike = [
		[true, false, true, true, true, false, true, false, false, false, false],
		[false, false, false, false, true, false, true, true, true, false, true],
	];
	for (const line of lines) {
		// N1: runs of five or more of one colour.
		let run = 1;
		for (let i = 1; i <= n; i++) {
			if (i < n && line[i] === line[i - 1]) run++;
			else {
				if (run >= 5) score += 3 + (run - 5);
				run = 1;
			}
		}
		// N3: 1:1:3:1:1 finder-like patterns with four light modules on one side.
		for (let i = 0; i + 11 <= n; i++)
			for (const pat of finderLike)
				if (pat.every((v, k) => line[i + k] === v)) score += 40;
	}
	// N2: 2x2 blocks of one colour.
	for (let y = 0; y < n - 1; y++)
		for (let x = 0; x < n - 1; x++) {
			const c = g.get(x, y);
			if (
				c === g.get(x + 1, y) &&
				c === g.get(x, y + 1) &&
				c === g.get(x + 1, y + 1)
			)
				score += 3;
		}
	// N4: balance of dark and light.
	let dark = 0;
	for (const row of g.dark) for (const v of row) if (v) dark++;
	const total = n * n;
	const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
	score += Math.max(0, k) * 10;
	return score;
}

/** Encode `text` (UTF-8, byte mode) at the smallest version that fits. Throws past version 10. */
export function qrMatrix(text: string, ecl: Ecl = "M"): boolean[][] {
	const bytes = Array.from(new TextEncoder().encode(text));
	let ver = 1;
	for (; ver <= MAX_VERSION; ver++) {
		const ccBits = ver < 10 ? 8 : 16;
		if (4 + ccBits + bytes.length * 8 <= dataCodewords(ver, ecl) * 8) break;
	}
	if (ver > MAX_VERSION) throw new Error("qr: text too long");

	// Data bits: mode, length, bytes, terminator, byte padding, pad codewords.
	const bits: number[] = [];
	const push = (v: number, len: number) => {
		for (let i = len - 1; i >= 0; i--) bits.push((v >>> i) & 1);
	};
	push(0b0100, 4);
	push(bytes.length, ver < 10 ? 8 : 16);
	for (const b of bytes) push(b, 8);
	const cap = dataCodewords(ver, ecl) * 8;
	push(0, Math.min(4, cap - bits.length));
	push(0, (8 - (bits.length % 8)) % 8);
	for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) push(pad, 8);
	const data: number[] = [];
	for (let i = 0; i < bits.length; i += 8) {
		let b = 0;
		for (let j = 0; j < 8; j++) b = (b << 1) | at(bits, i + j);
		data.push(b);
	}

	// Split into blocks, add error correction, interleave.
	const numBlocks = at(NUM_BLOCKS[ecl], ver);
	const eccLen = at(ECC_PER_BLOCK[ecl], ver);
	const raw = Math.floor(rawDataModules(ver) / 8);
	const numShort = numBlocks - (raw % numBlocks);
	const shortLen = Math.floor(raw / numBlocks);
	const div = rsDivisor(eccLen);
	const blocks: number[][] = [];
	for (let i = 0, k = 0; i < numBlocks; i++) {
		const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
		k += dat.length;
		const ecc = rsRemainder(dat, div);
		if (i < numShort) dat.push(0);
		blocks.push(dat.concat(ecc));
	}
	const all: number[] = [];
	for (let i = 0; i < (blocks[0]?.length ?? 0); i++)
		for (let j = 0; j < blocks.length; j++)
			if (i !== shortLen - eccLen || j >= numShort)
				all.push(at(blocks[j] ?? [], i));

	// Place, then keep the mask that scores best.
	const g = new Grid(ver);
	drawFunctionPatterns(g, ecl);
	drawCodewords(g, all);
	let best = 0;
	let bestScore = Number.POSITIVE_INFINITY;
	for (let m = 0; m < 8; m++) {
		applyMask(g, m);
		drawFormat(g, ecl, m);
		const p = penalty(g);
		if (p < bestScore) {
			best = m;
			bestScore = p;
		}
		applyMask(g, m); // XOR again undoes it
	}
	applyMask(g, best);
	drawFormat(g, ecl, best);
	return g.dark.map((row) => row.slice());
}

/** One SVG path for the dark modules (1 unit per module), offset by `quiet` modules. */
export function qrPath(m: readonly (readonly boolean[])[], quiet = 4): string {
	let d = "";
	m.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			if (!row[x]) {
				x++;
				continue;
			}
			const start = x;
			while (x < row.length && row[x]) x++;
			d += `M${start + quiet} ${y + quiet}h${x - start}v1h${start - x}z`;
		}
	});
	return d;
}
