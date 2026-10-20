// Checks every brand/listing asset against its expected pixel size and byte limit.
//   node verify.cjs        (prints a markdown table; exits 1 if anything fails)
const fs = require("node:fs");
const path = require("node:path");

const SUB = path.resolve(__dirname, "../..");
const MB = 1024 * 1024;
// [file, width, height, max bytes or null, needs alpha]
const SPEC = [
	["brand/logo-512.png", 512, 512, 1 * MB],
	["brand/logo-1024.png", 1024, 1024, 2 * MB],
	["brand/logo-transparent-1024.png", 1024, 1024, 2 * MB, true],
	["brand/logo.svg", null, null, 100 * 1024],
	["brand/logo-maskable.svg", null, null, 100 * 1024],
	["brand/icons/icon-192.png", 192, 192, 200 * 1024],
	["brand/icons/icon-512.png", 512, 512, 1 * MB],
	["brand/icons/icon-maskable-512.png", 512, 512, 1 * MB],
	["brand/icons/apple-touch-icon-180.png", 180, 180, 200 * 1024],
	["brand/wordmark-stacked-dark@2x.png", 1600, 800, 2 * MB],
	["brand/wordmark-stacked-transparent@2x.png", 1600, 800, 2 * MB, true],
	["brand/wordmark-horizontal-dark@2x.png", 2400, 480, 2 * MB],
	["brand/wordmark-horizontal-transparent@2x.png", 2400, 480, 2 * MB, true],
	["brand/keyart-1920x1080.png", 1920, 1080, 4 * MB],
	["brand/keyart-clean-1920x1080.png", 1920, 1080, 4 * MB],
	["brand/og-1200x630.png", 1200, 630, 0.9 * MB],
	["brand/masks-row.png", 3080, 680, 2 * MB],
	["listing/cover-840x300.png", 840, 300, 2 * MB],
	["listing/cover-1680x600@2x.png", 1680, 600, 2 * MB],
	...[
		"01-gathering",
		"02-collect",
		"03-practice",
		"04-spire",
		"05-reliquary",
	].flatMap((n) => [
		[`listing/screenshots/${n}.png`, 1080, 1920, 2 * MB],
		[`listing/screenshots/raw/${n}.png`, 780, 1688, 2 * MB],
	]),
];

function png(buf) {
	if (buf.readUInt32BE(0) !== 0x89504e47) return null;
	const colorType = buf[25];
	return {
		w: buf.readUInt32BE(16),
		h: buf.readUInt32BE(20),
		alpha: colorType === 4 || colorType === 6,
	};
}

let bad = 0;
const rows = [
	"| File | Size (px) | Bytes | Limit | OK |",
	"| --- | --- | --- | --- | --- |",
];
for (const [file, w, h, max, alpha] of SPEC) {
	const p = path.join(SUB, file);
	if (!fs.existsSync(p)) {
		rows.push(`| ${file} | missing | | | no |`);
		bad++;
		continue;
	}
	const buf = fs.readFileSync(p);
	const info = file.endsWith(".png") ? png(buf) : null;
	const dims = info
		? `${info.w}x${info.h}${info.alpha ? " RGBA" : ""}`
		: "vector";
	const okDims = !w || (info && info.w === w && info.h === h);
	const okAlpha = !alpha || (info && info.alpha);
	const okSize = !max || buf.length <= max;
	const ok = okDims && okAlpha && okSize;
	if (!ok) bad++;
	const kb = (n) =>
		n >= MB ? `${(n / MB).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`;
	rows.push(
		`| ${file} | ${dims} | ${kb(buf.length)} | ${max ? kb(max) : ""} | ${ok ? "yes" : "NO"} |`,
	);
}
console.log(rows.join("\n"));
process.exit(bad ? 1 : 0);
