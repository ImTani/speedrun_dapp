// One-off: expose the window shader's look constants as uniforms so they can be tuned live.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/glassgl.js";
let s = readFileSync(file, "utf8");
const rep = [
	["uniform vec2 uRes, uL; uniform float uT, uSwell;", "uniform vec2 uRes, uL; uniform float uT, uSwell;\nuniform float uHot, uAmb, uMoon, uLeak, uRim, uGrime, uBloom, uBloomGlass, uStreak, uRelief, uExpo;"],
	["vec3 sky = mix(vec3(.16, .17, .30), vec3(.30, .26, .34), p.y);", "vec3 sky = mix(vec3(.16, .17, .30), vec3(.30, .26, .34), p.y) * uAmb;"],
	["return sky + vec3(1., .9, .74) * (1.25 * exp(-r2 * 5.) + .9 * exp(-r2 * 34.) + 1.1 * disc);", "return sky + vec3(1., .9, .74) * (uHot * exp(-r2 * 5.) + uHot * .72 * exp(-r2 * 34.) + uMoon * disc);"],
	["vec2 g = vec2(dx, dy) * 7.;", "vec2 g = vec2(dx, dy) * uRelief;"],
	["1. + 1.35 * (streak - .5)", "1. + uStreak * (streak - .5)"],
	[
		"float leak = smoothstep(.9, .62, thick) * (.025 + .09 * dot(alb, vec3(.3, .5, .2)));",
		"float lum = dot(alb, vec3(.3, .5, .2));\n  // Dark glass never lets the view through (keeps faces and deep panes from going muddy).\n  float leak = uLeak * smoothstep(.9, .62, thick) * smoothstep(.015, .12, lum) * (.025 + .09 * lum);",
	],
	["rad *= 1. - smoothstep(.25, .6, leadB) * .45;", "rad *= 1. - smoothstep(.25, .6, leadB) * uGrime;"],
	["rad += L * sqrt(T) * rim * .32;", "rad += L * sqrt(T) * rim * uRim;"],
	["vec3 lit = sqrt(1. - exp(-rad * 2.1)) + spec;", "vec3 lit = sqrt(1. - exp(-rad * uExpo)) + spec;"],
	["c += bloom * mix(.18, .45, smoothstep(.2, .7, leadS));", "c += bloom * uBloom * mix(uBloomGlass, 1., smoothstep(.2, .7, leadS));"],
	[
		'gl.uniform1f(U("uSwell"), sw);',
		'gl.uniform1f(U("uSwell"), sw);\n\t\t\tfor (const [k, u] of Object.entries(UNIFORM)) gl.uniform1f(U(u), params[k]);',
	],
	[
		"return {\n\t\t\tswell()",
		"return {\n\t\t\tparams,\n\t\t\tset(k, v) { params[k] = v; if (reduce) requestAnimationFrame(frame); },\n\t\t\tswell()",
	],
	[
		"async function mount({ winCanvas, causticCanvas, theme = \"vesper\", seed = 13 }) {",
		"async function mount({ winCanvas, causticCanvas, theme = \"vesper\", seed = 13, preset = \"cathedral\" }) {\n\t\tconst params = { ...PRESETS[preset] };",
	],
];
const missing = [];
for (const [a, b] of rep) {
	if (!s.includes(a)) missing.push(a.slice(0, 60));
	s = s.replace(a, b);
}
// Presets and the uniform name map live next to mount().
const presets = `
	// Look presets for the window. "now" reproduces the previous constants exactly.
	const PRESETS = {
		now: { hot: 1.25, amb: 1, moon: 1.1, leak: 1, rim: 0.32, grime: 0.45, bloom: 0.45, bloomGlass: 0.4, streak: 1.35, relief: 7, expo: 2.1 },
		earlier: { hot: 0.8, amb: 1.2, moon: 0, leak: 0, rim: 0, grime: 0.38, bloom: 0, bloomGlass: 0, streak: 0.3, relief: 7, expo: 2.4 },
		cathedral: { hot: 0.4, amb: 1.7, moon: 0, leak: 0.35, rim: 0, grime: 0.3, bloom: 0.35, bloomGlass: 0, streak: 1.1, relief: 6, expo: 2.2 },
	};
	const UNIFORM = { hot: "uHot", amb: "uAmb", moon: "uMoon", leak: "uLeak", rim: "uRim", grime: "uGrime", bloom: "uBloom", bloomGlass: "uBloomGlass", streak: "uStreak", relief: "uRelief", expo: "uExpo" };
`;
s = s.replace("\t/**\n\t * Mount the lit window", `${presets}\n\t/**\n\t * Mount the lit window`);
if (!s.includes("const PRESETS")) missing.push("PRESETS insertion point");
s = s.replace("window.GL = { mount };", "window.GL = { mount, PRESETS };");
writeFileSync(file, s);
console.log(missing.length ? `MISSING: ${missing.join(" | ")}` : "shader now tunable");
