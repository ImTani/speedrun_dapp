// One-off: swap the Stage prototype's placeholder copy for the locked vocabulary.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/stage-gl.html";
let s = readFileSync(file, "utf8");
const rep = [
	[`<b id="gilt">1,240</b></div><div class="purse">Insight <b id="lv">7</b></div>`, `<b id="gilt">1,240</b><span class="unit">Ash</span></div><div class="purse">Resonance <b id="lv">7</b></div>`],
	[`font-size="28" fill="#efe4cc">F</text>`, `font-size="22" fill="#efe4cc">VII</text>`],
	[`<p>Keeps faith. Strikes back twice. Forgets nothing.</p>`, `<p>Wears the mask of <b class="aspect">Echo</b>. Answers as it was answered.</p>`],
	["<span class=\"pts\">+${r.pts}</span>", "<span class=\"pts\">+${r.pts} <small>Light</small></span>"],
	[`<div class="t">The candle burned 7h 40m</div><p>320 Insight and 85 Gilt wait for you.</p></div><div class="pane-btn" id="gather"><span>Gather</span>`, `<div class="t">Vesper kept vigil 7h 40m</div><p>320 Resonance and 85 Ash wait to be claimed.</p></div><div class="pane-btn" id="gather"><span>Claim</span>`],
	[`b.querySelector("span").textContent="Gathered"`, `b.querySelector("span").textContent="Claimed"`],
	[`<span>Lay tonight's spread</span><small>Sitting · 20:00</small>`, `<span>Attune for tonight</span><small>Gathering · 20:00</small>`],
	[`b.querySelector("span").textContent="Spread laid";b.querySelector("small").textContent="Sealed for 20:00"`, `b.querySelector("span").textContent="Attuned";b.querySelector("small").textContent="Sealed for 20:00"`],
	[`.hud{z-index:4}`, `.hud{z-index:4}
.purse .unit{font:800 12px/1 "Alegreya Sans SC",sans-serif;letter-spacing:.08em;color:var(--brass-l);margin-left:2px}
.plaque .aspect{font-style:normal;font-weight:600;color:var(--bone)}
.gslip .pts small{font:800 12px/1 "Alegreya Sans SC",sans-serif;letter-spacing:.08em;color:var(--brass-l)}`],
];
const missing = [];
for (const [a, b] of rep) {
	if (!s.includes(a)) missing.push(a.slice(0, 50));
	s = s.replace(a, b);
}
writeFileSync(file, s);
console.log(missing.length ? `MISSING: ${missing.join(" | ")}` : "all copy replaced");
