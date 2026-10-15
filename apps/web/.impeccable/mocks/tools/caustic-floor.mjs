// One-off: a "floor" mode for the caustics — light thrown onto the floor in front of the wall,
// measured from the floor's edge with a longer reach. Default behaviour (wall spill) is unchanged.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/glassgl.js";
let s = readFileSync(file, "utf8");
const rep = [
	["uniform vec2 uRes, uL; uniform vec4 uWin; uniform float uT, uGain;", "uniform vec2 uRes, uL; uniform vec4 uWin; uniform float uT, uGain, uReach, uFloor;"],
	["float z = max(dy, 0.) / uWin.w;", "// Wall mode: distance below the sill. Floor mode: distance from the floor's edge, scaled by reach.\n    float z = mix(max(dy, 0.), p.y, uFloor) / uWin.w / uReach;"],
	["float lip = smoothstep(-.04, .05, dy / uWin.w);", "float lip = mix(smoothstep(-.04, .05, dy / uWin.w), smoothstep(0., .06, p.y / uWin.w), uFloor);"],
	['gl2.uniform1f(C("uGain"), gain * causticBoost);', 'gl2.uniform1f(C("uGain"), gain * causticBoost);\n\t\t\t\tgl2.uniform1f(C("uReach"), causticReach);\n\t\t\t\tgl2.uniform1f(C("uFloor"), causticFloor ? 1 : 0);'],
	["preset = \"locked\", causticBoost = 1 }) {", "preset = \"locked\", causticBoost = 1, causticReach = 1, causticFloor = false }) {"],
];
const missing = [];
for (const [a, b] of rep) {
	if (!s.includes(a)) missing.push(a.slice(0, 70));
	s = s.replace(a, b);
}
writeFileSync(file, s);
new Function(s);
let g = readFileSync("glass/gathering.html", "utf8");
const a = "theme,seed,causticBoost:7})";
if (!g.includes(a)) missing.push("gathering mount call");
g = g.replace(a, "theme,seed,causticBoost:3.2,causticReach:2.6,causticFloor:true})");
writeFileSync("glass/gathering.html", g);
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "floor caustics added");
