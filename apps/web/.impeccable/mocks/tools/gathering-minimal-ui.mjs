// "Almost no UI": gilt names painted on the stone, Light counted in glass medallions set in each
// window's arch, choice words painted under the names, title/plaques/racks/roundels/Pass removed,
// and only two dim fittings left (ring = leave, hourglass = pass; hold the hourglass = always skip).
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/gathering.html";
let s = readFileSync(file, "utf8");
const missing = [];
const rep = (a, b) => { if (!s.includes(a)) missing.push(a.slice(0, 90)); s = s.replace(a, b); };
const cut = (startMark, endMark, replacement) => {
	const a = s.indexOf(startMark), b = s.indexOf(endMark, a);
	if (a < 0 || b < 0) { missing.push(`cut ${startMark.slice(0, 40)}`); return; }
	s = s.slice(0, a) + replacement + s.slice(b);
};

// --- Markup: remove band, racks, plaques, Pass, roundels; add medallions + gilt names ---
rep(` <div class="band"><div class="t">Gathering of the Fourteenth</div></div>\n`, ``);
cut(` <div class="rack" id="rOpp">`, `</div>\n<div class="fit" id="back"`,
	` <div class="gilt" id="pOpp" style="left:12px"><div class="gn">Old Marrow</div><div class="ga">wears Madness</div><div class="gc" id="eChOpp"></div></div>
 <div class="gilt" id="pYou" style="left:208px"><div class="gn">Vesper</div><div class="ga">wears Echo · your fragment</div><div class="gc" id="eChYou"></div></div>
`);
rep(`<div class="niche" id="nOpp"><svg class="emb" id="eOpp" width="170" height="238" viewBox="0 0 170 238"></svg>`, `<div class="niche" id="nOpp"><svg class="emb" id="eOpp" width="170" height="238" viewBox="0 0 170 238"></svg><div class="medals" id="cOpp"></div>`);
rep(`<div class="niche" id="nYou"><svg class="emb" id="eYou" width="170" height="238" viewBox="0 0 170 238"></svg>`, `<div class="niche" id="nYou"><svg class="emb" id="eYou" width="170" height="238" viewBox="0 0 170 238"></svg><div class="medals" id="cYou"></div>`);
rep(`<div class="sill">your fragment</div>`, ``);
// The Pass plate goes; the hourglass passes (tap) and sets "always skip" (hold).
const passStart = s.indexOf(`<div class="fit" id="pass"`);
if (passStart < 0) missing.push("pass plate"); else s = s.slice(0, passStart) + s.slice(s.indexOf("</div>", s.indexOf("</svg>", passStart)) + 6);
rep(`<div class="fit" id="hour" role="switch" aria-checked="false" aria-label="Skip the rite in future Gatherings">`, `<div class="fit" id="hour" role="button" aria-label="Pass to the outcome (hold: always pass)">`);
rep(`<div class="roundels" id="rds"></div>`, `<div class="roundels" id="rds" hidden></div>`);

// --- CSS ---
rep(`#back{left:10px}#pass{right:8px}#hour{right:54px}`, `#back{left:10px;opacity:.55}#hour{top:auto;bottom:14px;right:12px;opacity:.55}`);
rep(`body.painted .plaque{filter:brightness(.78) contrast(1.05) saturate(.85)}`, `/* Gilt lettering painted on the stone */
.gilt{position:absolute;top:316px;width:170px;text-align:center;pointer-events:none}
.gn{font:700 21px/1 "Grenze Gotisch",serif;color:#a98652;text-shadow:0 1px 0 rgba(0,0,0,.7),0 0 1px rgba(169,134,82,.4);letter-spacing:.02em}
.ga{margin-top:5px;font:italic 400 14px/1.2 "Spectral",serif;color:#7d6c55}
.gc{margin-top:8px;font:700 18px/1 "Grenze Gotisch",serif;opacity:0;transition:opacity .35s}
.gilt.show .gc{opacity:1}.gc.k{color:#d8b26a}.gc.d{color:#c4424f}
/* Light, counted in glass medallions set into the arch */
.medals{position:absolute;inset:0;pointer-events:none}
.medal{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#2a2230,#120e16 70%);border:1px solid #07060a}
.medal::after{content:"";position:absolute;left:-7px;top:-7px;width:23px;height:23px;border-radius:50%;opacity:0;transition:opacity .5s;background:radial-gradient(rgba(var(--g),.55),rgba(var(--g),0) 70%);mix-blend-mode:screen}
.medal.lit{background:radial-gradient(circle at 40% 35%,#fff3cf,rgb(var(--g)) 55%,rgba(var(--g),.6))}
.medal.lit::after{opacity:1}
.medal.lit.weak{filter:brightness(.6) saturate(.7)}
#cOpp{--g:198,160,230}#cYou{--g:240,176,96}`);
rep(`.whisper{position:absolute;left:0;right:0;bottom:10px;text-align:center;font:800 12px/1 "Alegreya Sans SC",sans-serif;letter-spacing:.12em;color:#a8977a;`,
	`.whisper{position:absolute;left:0;right:0;bottom:24px;text-align:center;font:italic 400 14px/1 "Spectral",serif;letter-spacing:.02em;color:#6f6250;`);
rep(`.brass{color:#c9a45a;text-shadow:0 -1px 0 rgba(0,0,0,.75),0 1px 0 rgba(255,230,170,.18)}`, `.brass{color:#b08d52;text-shadow:0 1px 0 rgba(0,0,0,.8)}`);

// --- Environment: the band rect and rack lights go ---
rep(`<rect x="62" y="14" width="226" height="38" fill="#0d0a10"/><rect x="62" y="14" width="226" height="3" fill="#050407"/>`, ``);
rep(`{x:97,y:345,r:95,color:[255,170,92],a:.55},{x:293,y:345,r:95,color:[255,170,92],a:.55},`, `{x:97,y:330,r:110,color:[170,140,190],a:.35},{x:293,y:330,r:110,color:[220,150,110],a:.35},`);

// --- Logic: medallions stand in for the candle racks ---
rep("function cups(w){rackEl(w).innerHTML=Array.from({length:24},(_,i)=>`<div class=\"cup\" style=\"--d:${(i*137%900)/1000}s\"><div class=\"fl\"></div></div>`).join(\"\")}",
	`// 25 medallions along the arch: up the left reveal, over the arch, down the right (niche coordinates).
const MEDAL_PTS=(()=>{const pts=[],cx=85,cy=88,R=79,side=214-cy,arc=Math.PI*R,total=2*side+arc,n=25;
 for(let i=0;i<n;i++){let d=i/(n-1)*total;if(d<=side){pts.push([cx-R,214-d]);continue}d-=side;if(d<=arc){const a=Math.PI+d/R;pts.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R]);continue}d-=arc;pts.push([cx+R,cy+d])}return pts})();
function cups(w){rackEl(w).innerHTML=MEDAL_PTS.map(([x,y])=>\`<i class="medal" style="left:\${x}px;top:\${y}px"></i>\`).join("")}`);
rep("function lightCandle(w,weak){const el=nextCup(w);if(!el)return null;lit[w]++;el.classList.add(\"lit\");if(weak)el.classList.add(\"weak\");$(`#${w}Light`).textContent=lit[w];return el}",
	"function lightCandle(w,weak){const el=nextCup(w);if(!el)return null;lit[w]++;el.classList.add(\"lit\");if(weak)el.classList.add(\"weak\");return el}");
rep("function enamel(w,c){const e=$(w===\"you\"?\"#eChYou\":\"#eChOpp\");e.textContent=c===\"K\"?\"kindles\":\"devours\";e.className=\"enamel \"+(c===\"K\"?\"k\":\"d\");",
	"function enamel(w,c){const e=$(w===\"you\"?\"#eChYou\":\"#eChOpp\");e.textContent=c===\"K\"?\"kindles\":\"devours\";e.className=\"gc \"+(c===\"K\"?\"k\":\"d\");");
rep(`lit.you=lit.opp=0;cups("you");cups("opp");$("#youLight").textContent=$("#oppLight").textContent="0";`, `lit.you=lit.opp=0;cups("you");cups("opp");`);
// Controls: hourglass tap = pass, hold = always pass.
rep(`$("#pass").addEventListener("click",finish);`, `let hourHold=null,hourHeld=false;
$("#hour").addEventListener("pointerdown",()=>{hourHeld=false;hourHold=setTimeout(()=>{hourHeld=true;localStorage.setItem("apostasy.skipAnimations",fast()?"0":"1");syncFast();if(fast())finish()},650)});
["pointerup","pointerleave","pointercancel"].forEach(n=>$("#hour").addEventListener(n,()=>clearTimeout(hourHold)));
$("#hour").addEventListener("click",()=>{if(!hourHeld)finish()});`);
rep(`$("#hour").addEventListener("click",()=>{localStorage.setItem("apostasy.skipAnimations",fast()?"0":"1");syncFast();if(fast())finish()});`, ``);
rep(`const fast=()=>localStorage.getItem("apostasy.skipAnimations")==="1",syncFast=()=>{$("#hour").classList.toggle("on",fast());$("#hour").setAttribute("aria-checked",String(fast()))};`,
	`const fast=()=>localStorage.getItem("apostasy.skipAnimations")==="1",syncFast=()=>{$("#hour").classList.toggle("on",fast())};`);
rep(`$("#whisper").textContent="Touch to hasten · hold to rush";`, `$("#whisper").textContent="touch to hasten · hold to rush";$("#whisper").style.opacity=1;setTimeout(()=>$("#whisper").style.opacity=0,5000);`);
rep(`$("#whisper").textContent="Touch the stone to watch again · the ring to leave";`, `$("#whisper").textContent="touch the stone to watch again";`);
rep(`<div class="whisper" id="whisper">Touch to hasten · hold to rush</div>`, `<div class="whisper" id="whisper">touch to hasten · hold to rush</div>`);

writeFileSync(file, s);
const left = ["#pass", "class=\"rack\"", "class=\"plaque\"", "class=\"band\""].filter((k) => s.includes(k));
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "minimal UI applied", left.length ? `\nLEFTOVER: ${left.join(", ")}` : "");
