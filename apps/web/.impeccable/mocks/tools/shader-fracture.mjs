// One-off: fracture rendered inside the window shader (dark breaks, shard refraction offset, edge glints).
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/glassgl.js";
let s = readFileSync(file, "utf8");
const crackBlock = `vec2 off = g * .0045;
  // Fracture: radial breaks from the face outward plus a partial ring; shards refract out of line.
  vec2 cp = (vUv - vec2(.5, .6)) * vec2(aspect, 1.);
  float cr = length(cp), ca = atan(cp.y, cp.x), seg = 6.2831 / 9.;
  float kk = floor(ca / seg + .5);
  float ad = (fract(ca / seg + .5 + (h21(vec2(kk, 3.)) - .5) * .3) - .5) * seg;
  float wob = (fbm(cp * 16.) - .5) * .014;
  float reach = uCrack * .62;
  float inside = step(cr, reach) * step(.015, cr);
  float dl = abs(ad) * cr + wob;
  float crackLine = smoothstep(.0055, .0015, dl) * inside;
  float ring = smoothstep(.006, .0015, abs(cr - .1 - .04 * h21(vec2(kk, 9.)))) * step(.11, reach) * step(.45, h21(vec2(kk, 5.)));
  float crack = max(crackLine, ring);
  float glint = smoothstep(.012, .004, dl) * (1. - crackLine) * inside;
  off += sign(ad) * vec2(.0035, -.002) * uCrack * inside;`;
const rep = [
	["uniform vec2 uRes, uL; uniform float uT, uSwell, uDim, uRed;", "uniform vec2 uRes, uL; uniform float uT, uSwell, uDim, uRed, uCrack;"],
	["vec2 off = g * .0045;", crackBlock],
	["  o = vec4(c * base.a, base.a);\n}`;", "  c = mix(c, vec3(.015, .012, .018), crack * .9) + vec3(1., .94, .82) * glint * .22 * (1. - uDim * .5);\n  o = vec4(c * base.a, base.a);\n}`;"],
	['\t\t\tgl.uniform1f(U("uRed"), red);', '\t\t\tgl.uniform1f(U("uRed"), red);\n\t\t\tcrk += (crkTarget - crk) * 0.12;\n\t\t\tgl.uniform1f(U("uCrack"), crk);'],
	["let dim = 0, dimTarget = 0, red = 0, redTarget = 0, gain = 1;", "let dim = 0, dimTarget = 0, red = 0, redTarget = 0, gain = 1, crk = 0, crkTarget = 0;"],
	["red(v) { redTarget = v; },", "red(v) { redTarget = v; },\n\t\t\tcrack(v) { crkTarget = v; },"],
];
const missing = [];
for (const [a, b] of rep) {
	if (!s.includes(a)) missing.push(a.slice(0, 70));
	s = s.replace(a, b);
}
writeFileSync(file, s);
new Function(s);
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "fracture in shader");
