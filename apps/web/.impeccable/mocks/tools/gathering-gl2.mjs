// One-off: window "bleed" (crimson devour) + caustic gain tied to swell/dim, for the Gathering.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/glassgl.js";
let s = readFileSync(file, "utf8");
const rep = [
	["uniform vec2 uRes, uL; uniform float uT, uSwell, uDim;", "uniform vec2 uRes, uL; uniform float uT, uSwell, uDim, uRed;"],
	["* (1. + uSwell * .6) * (1. - uDim * .7);", "* (1. + uSwell * .6) * (1. - uDim * .7) * mix(vec3(1.), vec3(1.5, .32, .38), uRed);"],
	["uniform vec2 uRes, uL; uniform vec4 uWin; uniform float uT;", "uniform vec2 uRes, uL; uniform vec4 uWin; uniform float uT, uGain;"],
	["o = vec4(acc, 1.);\n}`;", "o = vec4(acc * uGain, 1.);\n}`;"],
	['\t\t\tgl.uniform1f(U("uDim"), dim);', '\t\t\tgl.uniform1f(U("uDim"), dim);\n\t\t\tred += (redTarget - red) * 0.09;\n\t\t\tgl.uniform1f(U("uRed"), red);'],
	["let dim = 0, dimTarget = 0;", "let dim = 0, dimTarget = 0, red = 0, redTarget = 0, gain = 1;"],
	['gl2.uniform1f(C("uT"), reduce ? 0 : t);', 'gl2.uniform1f(C("uT"), reduce ? 0 : t);\n\t\t\t\tgain += ((1 + sw * 1.4) * (1 - dim * 0.85) * (1 + red * 0.3) - gain) * 0.1;\n\t\t\t\tgl2.uniform1f(C("uGain"), gain * causticBoost);'],
	["dim(v) { dimTarget = v; },", "dim(v) { dimTarget = v; },\n\t\t\tred(v) { redTarget = v; },"],
	["async function mount({ winCanvas, causticCanvas, theme = \"vesper\", seed = 13, preset = \"locked\" }) {", "async function mount({ winCanvas, causticCanvas, theme = \"vesper\", seed = 13, preset = \"locked\", causticBoost = 1 }) {"],
];
const missing = [];
for (const [a, b] of rep) {
	if (!s.includes(a)) missing.push(a.slice(0, 70));
	s = s.replace(a, b);
}
writeFileSync(file, s);
new Function(s);
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "bleed + caustic gain added");
