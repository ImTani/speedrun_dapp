// Masks painted onto the glass (grisaille), faintly glowing mask eyes, a placeholder window until the
// shader is ready, and roundels moved off the floor eye.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/gathering.html";
let s = readFileSync(file, "utf8");
const missing = [];
const rep = (a, b) => { if (!s.includes(a)) missing.push(a.slice(0, 80)); s = s.replace(a, b); };

rep(`.facemask{position:absolute;left:52px;top:100px;width:44px;pointer-events:none;filter:drop-shadow(0 1px 0 #0b0a10) drop-shadow(0 -1px 0 #0b0a10) drop-shadow(1px 0 0 #0b0a10) drop-shadow(-1px 0 0 #0b0a10);opacity:.94;transition:filter .4s,opacity .4s}`,
	`/* Grisaille: the Aspect mask is painted onto the glass, so the window's light (and its crimson bleed) shows through it. */
.facemask{position:absolute;left:52px;top:100px;width:44px;height:37px;pointer-events:none}
.facemask svg.mask{mix-blend-mode:multiply;filter:contrast(1.15) brightness(1.05);opacity:.92}
.meye{position:absolute;width:5px;height:3px;margin:-1.5px 0 0 -2.5px;border-radius:50%;background:radial-gradient(#ffb08a,#d0301a 55%,rgba(208,48,26,0) 75%);mix-blend-mode:screen;opacity:0;animation:meye 9s ease-in-out infinite}
@keyframes meye{0%,55%{opacity:0}66%,92%{opacity:.85}94%{opacity:0}96%{opacity:.85}100%{opacity:0}}`);
rep(`$("#mOpp").innerHTML=MASK.mask(OPP.aspect,44);$("#mYou").innerHTML=MASK.mask(YOU.aspect,44);`,
	`// Where each Aspect mask's eye holes sit (in its 100×84 drawing), so the eyes behind them can glow.
const MASK_EYES={mercy:[[34,39],[66,39]],hunger:[[34,34],[66,34]],echo:[[31,38],[69,38]],rancour:[[31,35],[69,35]],appetite:[[32,37],[68,37]],inquisitor:[[33,27],[67,27]],madness:[[34,42],[68,44]]};
function faceMask(el,aspect,delay){el.innerHTML=MASK.mask(aspect,44)+MASK_EYES[aspect].map(([x,y])=>\`<i class="meye" style="left:\${x*.44}px;top:\${y*.44}px;animation-delay:\${delay}s"></i>\`).join("")}
faceMask($("#mOpp"),OPP.aspect,-2.5);faceMask($("#mYou"),YOU.aspect,-6.8);`);
// Placeholder glass until the shader window is ready, so an embrasure is never empty.
rep(`async function win(id,theme,seed){try{`, `async function win(id,theme,seed){$(\`#\${id}\`).insertAdjacentHTML("afterbegin",G.windowSVG({theme,seed,width:148}).replace('class="win"','class="win ph"'));try{`);
rep(`if(a){api[id]=a;return}}catch(e){console.error(e)}\n $(\`#\${id}Gl\`).remove();$(\`#\${id}\`).insertAdjacentHTML("afterbegin",G.windowSVG({theme,seed,width:148}))}`,
	`if(a){api[id]=a;$(\`#\${id} .ph\`)?.remove();return}}catch(e){console.error(e)}\n $(\`#\${id}Gl\`).remove()}`);
// Roundels below the compass so the inlaid eye can be seen opening.
rep(`.roundels{position:absolute;left:0;right:0;top:739px;`, `.roundels{position:absolute;left:0;right:0;top:780px;`);
rep(`.whisper{position:absolute;left:0;right:0;bottom:22px;`, `.whisper{position:absolute;left:0;right:0;bottom:10px;`);

writeFileSync(file, s);
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "grisaille masks + placeholders + roundels moved");
