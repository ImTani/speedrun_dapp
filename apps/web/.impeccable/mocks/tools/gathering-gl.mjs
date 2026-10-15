// One-off: renderer support for the Gathering (optional caustics, a dim channel), plus Rancour's nose fix.
import { readFileSync, writeFileSync } from "node:fs";

function patch(file, rep) {
	let s = readFileSync(file, "utf8");
	const missing = [];
	for (const [a, b] of rep) {
		if (!s.includes(a)) missing.push(a.slice(0, 60));
		s = s.replace(a, b);
	}
	writeFileSync(file, s);
	console.log(file, missing.length ? `MISSING: ${missing.join(" | ")}` : "ok");
}

patch("glass/glassgl.js", [
	["uniform vec2 uRes, uL; uniform float uT, uSwell;", "uniform vec2 uRes, uL; uniform float uT, uSwell, uDim;"],
	["vec3 L = behind(vUv + g * .02, aspect) * (1. + uSwell * .6);", "vec3 L = behind(vUv + g * .02, aspect) * (1. + uSwell * .6) * (1. - uDim * .7);"],
	['const gl2 = causticCanvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });\n\t\tif (!gl || !gl2) return null;',
		'const gl2 = causticCanvas ? causticCanvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false }) : null;\n\t\tif (!gl || (causticCanvas && !gl2)) return null;'],
	['gl.uniform1f(U("uSwell"), sw);', 'gl.uniform1f(U("uSwell"), sw);\n\t\t\tdim += (dimTarget - dim) * 0.07;\n\t\t\tgl.uniform1f(U("uDim"), dim);'],
	["let light = [0.5, 0.36],", "let dim = 0, dimTarget = 0;\n\t\tlet light = [0.5, 0.36],"],
	["set(k, v) {", "dim(v) { dimTarget = v; },\n\t\t\tset(k, v) {"],
]);

// Caustics block: skip entirely when no caustic canvas was given.
let g = readFileSync("glass/glassgl.js", "utf8");
const cStart = g.indexOf("const cscale = 0.5;");
const cEnd = g.indexOf("const C = (n) => gl2.getUniformLocation(pc, n);");
if (cStart > 0 && cEnd > cStart) {
	const block = g.slice(cStart, cEnd + "const C = (n) => gl2.getUniformLocation(pc, n);".length);
	g = g.replace(block, `let pc = null, C = () => null;\n\t\tif (gl2) {\n${block.replace("const pc =", "pc =").replace("const C = (n) =>", "C = (n) =>")}\n\t\t}`);
}
const dStart = g.indexOf("gl2.viewport(");
const dEnd = g.indexOf("gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4);");
if (dStart > 0 && dEnd > dStart) {
	const block = g.slice(dStart, dEnd + "gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4);".length);
	g = g.replace(block, `if (gl2) {\n\t\t\t\t${block}\n\t\t\t}`);
}
writeFileSync("glass/glassgl.js", g);
new Function(g);
console.log("caustics optional:", g.includes("if (gl2) {") ? "ok" : "MISSING");

patch("glass/masks.js", [
	['<path d="M45 50 Q44 62 47 72 Q57 66 58 50Z" fill="#4a2719"/>', '<path d="M47 33 Q43 44 45 55 Q52 57 57 51 Q53 50 52.5 44 Q52 37 54 33Z" fill="#4a2719" stroke="#0b0a10" stroke-width="1.2"/>'],
	['<path d="M9 31 Q29 15 50 19 Q71 15 91 31 Q87 47 67 49 L58 50 Q57 66 47 72 Q43 61 45 50 L33 49 Q13 47 9 31Z" fill="#6b3b2a" stroke="#0b0a10" stroke-width="1.8"/>',
		'<path d="M9 31 Q29 15 50 19 Q71 15 91 31 Q87 49 67 51 Q57 52 50 57 Q43 52 33 51 Q13 49 9 31Z" fill="#6b3b2a" stroke="#0b0a10" stroke-width="1.8"/>'],
]);
