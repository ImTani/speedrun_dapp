// Fix batch 2: plaque enamel replaces the Aspect line during a reveal, carved title clears the fittings,
// roundels + compass move below the outcome, and a review-only ?from=N starts the replay at turn N.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/gathering.html";
let s = readFileSync(file, "utf8");
const rep = [
	// Enamel lives in the sub row, swapping with the Aspect name.
	[`<div class="top"><span class="nm">Old Marrow</span><span class="enamel" id="eChOpp"></span></div><div class="sub"><span class="asp">Madness</span>`,
		`<div class="top"><span class="nm">Old Marrow</span></div><div class="sub"><span class="slot"><span class="asp">Madness</span><span class="enamel" id="eChOpp"></span></span>`],
	[`<div class="top"><span class="nm">Vesper</span><span class="enamel" id="eChYou"></span></div><div class="sub"><span class="asp">Echo</span>`,
		`<div class="top"><span class="nm">Vesper</span></div><div class="sub"><span class="slot"><span class="asp">Echo</span><span class="enamel" id="eChYou"></span></span>`],
	[".plaque.show .enamel{opacity:1;transform:none}",
		".slot{position:relative;display:inline-grid}.slot>*{grid-area:1/1;align-self:center;justify-self:start}\n.plaque .asp{transition:opacity .2s}.plaque.show .asp{opacity:0}\n.plaque.show .enamel{opacity:1;transform:none}"],
	// Carved title sits between the ring and the hourglass.
	[".band{position:absolute;left:66px;right:66px;top:14px;height:38px;", ".band{position:absolute;left:62px;right:102px;top:14px;height:38px;"],
	[".band .t{font:700 21px/1 \"Grenze Gotisch\",serif;", ".band .t{font:700 18px/1 \"Grenze Gotisch\",serif;"],
	[`<div class="t">The Gathering of the Fourteenth</div>`, `<div class="t">Gathering of the Fourteenth</div>`],
	// Roundels and compass below the outcome inscription.
	[".roundels{position:absolute;left:0;right:0;top:688px;", ".roundels{position:absolute;left:0;right:0;top:739px;"],
	["const cy=fy(1.35),rx=118,ry=30;", "const cy=fy(1.2),rx=124,ry=32;"],
	// Review-only: start at a later turn, with earlier turns already settled.
	["for(let i=0;i<TURNS.length;i++){if(skipped||my!==gen)return;await turn(i,my)}if(my===gen)finish()}",
		`const from=Math.min(TURNS.length-1,+new URLSearchParams(location.search).get("from")||0);
 for(let i=0;i<from;i++){const [a,b]=TURNS[i],[p,q]=PAY[a+b];for(let k=0;k<p;k++)lightCandle("you",a+b==="DD");for(let k=0;k<q;k++)lightCandle("opp",a+b==="DD");roundel($(\`.rd[data-i="\${i}"]\`),a,b);
  if(a+b==="KD")api.you?.crack(crackYou=Math.min(1,crackYou+.5));if(a+b==="DK")api.opp?.crack(crackOpp=Math.min(1,crackOpp+.5))}
 for(let i=from;i<TURNS.length;i++){if(skipped||my!==gen)return;await turn(i,my)}if(my===gen)finish()}`],
];
const missing = [];
for (const [a, b] of rep) {
	if (!s.includes(a)) missing.push(a.slice(0, 70));
	s = s.replace(a, b);
}
writeFileSync(file, s);
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "fix batch 2 applied");
