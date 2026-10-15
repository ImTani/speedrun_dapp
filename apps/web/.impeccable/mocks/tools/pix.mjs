// Design-sketch tool: turns hand-authored ASCII pixel maps into crisp inline SVG (one path per colour).
// Usage: node pix.mjs <template.html> <out.html>  — replaces {{sprite:name:scale}} tokens.
import { readFileSync, writeFileSync } from "node:fs";

const PAL = {
	k: "#1b1420", d: "#3b2a3f", D: "#2a1d2e", r: "#b8323c", R: "#7c1f2c", o: "#e9b23a", O: "#a8741c",
	s: "#f1c9a0", S: "#c98f6a", w: "#efe6d2", W: "#cfc3ab", b: "#3c5aa6", B: "#26386e", g: "#6b7a8f",
	G: "#a9b6c6", n: "#6b3b2a", N: "#4a2719", f: "#ffd75a", F: "#ff7a30", v: "#6e4a9e", V: "#4b3170",
};

const SPRITES = {
	// Hooded duelist, 20x24
	hero: `
.......kkkkkk.......
.....kkRrrrrRkk.....
....kRrrrrrrrrRk....
...kRrrrkkkkrrrRk...
...kRrrkSssSkrrRk...
...kRrkSksskSkrRk...
...kRrksssssskrRk...
...kRrkssSSsskrRk...
....kRkkSsSkkRk.....
...kkRRkkkkkkRRkk...
..kRrrrroooorrrrRk..
.kRrrrrroOOorrrrrRk.
.kRrrrrrroOrrrrrrRk.
kGkRrrrrrroorrrrRkGk
kGGkRrrrrrrrrrrRkGGk
kgGkRrrrrrrrrrrRkGgk
.kkkRrrrrrrrrrrRkkk.
...kRrrrrrrrrrrRk...
...kRRrrrkkrrrRRk...
....kRRrkDDkrRRk....
....kDDDk..kDDDk....
....kNnNk..kNnNk....
...kNnnNk..kNnnNk...
...kkkkk....kkkkk...`,
	// Card back, 14x20
	back: `
kkkkkkkkkkkkkk
kooooooooooook
kobbbbbbbbbbok
kobrbbbbbbrbok
kobbrbbbbrbbok
kobbbrbbrbbbok
kobbbbrrbbbbok
kobbbbroobbbok
kobbbrooorbbok
kobbrooooorbok
kobbrooooorbok
kobbbrooorbbok
kobbbbroobbbok
kobbbbrrbbbbok
kobbbrbbrbbbok
kobbrbbbbrbbok
kobrbbbbbbrbok
kobbbbbbbbbbok
kooooooooooook
kkkkkkkkkkkkkk`,
	// Card face (upright figure), 14x20
	face: `
kkkkkkkkkkkkkk
kwwwwwwwwwwwwk
kwkkkkkkkkkkwk
kwkwwwwwwwwkwk
kwkwwwooowwkwk
kwkwwoffoowkwk
kwkwwwooowwkwk
kwkwwwkskwwkwk
kwkwwrrrrrwkwk
kwkwrrrorrrkwk
kwkwrrrorrrkwk
kwkwwrrrrrwkwk
kwkwwrkwkrwkwk
kwkwwnkwknwkwk
kwkwwwwwwwwkwk
kwkkkkkkkkkkwk
kwwkkwwwkkwwwk
kwwkwkwkwkwwwk
kwwwwwwwwwwwwk
kkkkkkkkkkkkkk`,
	// Candle with flame, 8x16
	candle: `
...ff...
..fFFf..
..fFfF..
...Ff...
...kk...
..kwwk..
..kwwk..
..kwWk..
..kwwk..
..kwWk..
..kwwk..
..kwWk..
.kkwwkk.
kOoooooOk
kkkkkkkkk
........`,
	// Small chest, 14x11
	chest: `
..kkkkkkkkkk..
.knnnnnnnnnnk.
knNnnnnnnnnNnk
kOOOOOOOOOOOOk
knnnnnkokknnnk
knNnnkoOokNnnk
knnnnnkokknnnk
knNnnnnnnnnNnk
knnnnnnnnnnnnk
kOOOOOOOOOOOOk
kkkkkkkkkkkkkk`,
};

function svg(name, scale) {
	const rows = SPRITES[name].trim().split("\n");
	const h = rows.length;
	const w = Math.max(...rows.map((r) => r.length));
	const paths = {};
	rows.forEach((row, y) =>
		[...row].forEach((ch, x) => {
			if (!PAL[ch]) return;
			paths[ch] = `${paths[ch] ?? ""}M${x} ${y}h1v1h-1z`;
		}),
	);
	const body = Object.entries(paths)
		.map(([ch, d]) => `<path fill="${PAL[ch]}" d="${d}"/>`)
		.join("");
	return `<svg width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
}

const [tpl, out] = process.argv.slice(2);
const html = readFileSync(tpl, "utf8").replace(/\{\{sprite:(\w+):(\d+)\}\}/g, (_, n, s) => svg(n, Number(s)));
writeFileSync(out, html);
console.log(`wrote ${out}`);
