// Fix batch 1 for the in-world Gathering: floor light, votive cups, inscription position, type sizes and contrast.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/gathering.html";
let s = readFileSync(file, "utf8");
const rep = [
	// Floor light pools: the Gathering's exchange depends on seeing them.
	["theme,seed,causticBoost:2.2})", "theme,seed,causticBoost:7})"],
	// Votive cups: small glass cups on visible iron rails, not a brick grid.
	[".cups{position:absolute;inset:0 0 0 0;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(3,1fr);gap:2px 3px;padding:0 2px}",
		".cups{position:absolute;inset:0;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(3,1fr);gap:4px 6px;padding:0 4px}\n.rack::before,.rack::after{content:\"\";position:absolute;left:-2px;right:-2px;height:2px;background:#3a3340;box-shadow:0 1px 0 #000}\n.rack::before{top:16px}.rack::after{top:34px}"],
	[".cup{position:relative;align-self:end;height:11px;border-radius:2px 2px 4px 4px;background:linear-gradient(180deg,#5e1420,#2c0810);border:1px solid #0b0a10}",
		".cup{position:relative;align-self:end;justify-self:center;width:10px;height:9px;border-radius:2px 2px 4px 4px;background:linear-gradient(180deg,#3d0d16,#1a050a);border:1px solid #0b0a10;z-index:1}"],
	// Inscription sits above the compass, not on it.
	[".inscr{position:absolute;left:30px;right:30px;top:548px;", ".inscr{position:absolute;left:30px;right:30px;top:476px;"],
	// Type sizes (floor of 12px) and contrast.
	[".band .k{font:800 11px/1 \"Alegreya Sans SC\",sans-serif;letter-spacing:.16em;color:#8f7f63;", ".band .k{font:800 12px/1 \"Alegreya Sans SC\",sans-serif;letter-spacing:.14em;color:#b3a283;"],
	[".plaque .asp{font:800 11px/1", ".plaque .asp{font:800 12px/1"],
	[".plaque .lt small{font:800 10px/1", ".plaque .lt small{font:800 12px/1"],
	["display:grid;place-items:center;font:800 11px/1 \"Alegreya Sans SC\",sans-serif;letter-spacing:.12em;border:1px solid #2a1f0e;", "display:grid;place-items:center;font:800 12px/1 \"Alegreya Sans SC\",sans-serif;letter-spacing:.1em;border:1px solid #2a1f0e;"],
	[".whisper{position:absolute;left:0;right:0;bottom:20px;text-align:center;font:800 11px/1 \"Alegreya Sans SC\",sans-serif;letter-spacing:.16em;color:#6c5f4c;", ".whisper{position:absolute;left:0;right:0;bottom:20px;text-align:center;font:800 12px/1 \"Alegreya Sans SC\",sans-serif;letter-spacing:.14em;color:#a8977a;"],
	["margin-top:14px;font:800 11px/1 \"Alegreya Sans SC\",sans-serif;letter-spacing:.12em;color:#8f7f63}", "margin-top:14px;font:800 12px/1 \"Alegreya Sans SC\",sans-serif;letter-spacing:.1em;color:#b3a283}"],
	[".inscr .l2{margin-top:6px;font:italic 400 16px/1.4 \"Spectral\",serif;color:#a8977a;", ".inscr .l2{margin-top:6px;font:italic 400 16px/1.4 \"Spectral\",serif;color:#c4b394;"],
];
const missing = [];
for (const [a, b] of rep) {
	if (!s.includes(a)) missing.push(a.slice(0, 60));
	s = s.replace(a, b);
}
writeFileSync(file, s);
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "fix batch applied");
