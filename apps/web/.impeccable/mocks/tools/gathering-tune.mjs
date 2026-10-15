// Remove all grain; make caustic placement + scene darkness tunable live (?tune).
import { readFileSync, writeFileSync } from "node:fs";

function patch(file, rep) {
	let s = readFileSync(file, "utf8");
	const missing = [];
	for (const [a, b] of rep) { if (!s.includes(a)) missing.push(a.slice(0, 70)); s = s.replace(a, b); }
	writeFileSync(file, s);
	console.log(file, missing.length ? `MISSING:\n  ${missing.join("\n  ")}` : "ok");
	return s;
}

// 1. Noise out: no grain overlay, no grain/weave in the painting.
patch("glass/gathering.html", [
	[`<canvas id="grain"></canvas><div class="vign"></div>`, `<div class="vign"></div>`],
	[`/* ---------- Canvas grain over everything, so the brass and glass sit in the same painting ---------- */
(function(){const c=$("#grain"),x=c.getContext("2d");c.width=130;c.height=282;const im=x.createImageData(130,282);
 (function tick(){for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}x.putImageData(im,0,0);if(!reduce)setTimeout(tick,90)})()})();
`, ``],
]);
patch("glass/envgl.js", [
	[`  float weave = (sin(px.x * 1.9) * sin(px.y * 1.9)) * .012;
  float grain = (h(px + floor(uT * 12.)) - .5) * .05;
  c += weave + grain * (.4 + l);`, `  c *= uExpo;`],
	["uniform sampler2D uPaint; uniform vec2 uRes; uniform float uT, uEye;", "uniform sampler2D uPaint; uniform vec2 uRes; uniform float uT, uEye, uExpo, uVig;"],
	["c *= smoothstep(.95, .25, length(q * vec2(1.25, 1.)));", "c *= mix(1., smoothstep(.95, .25, length(q * vec2(1.25, 1.))), uVig);"],
	["gl.uniform1f(U(\"uT\"), reduce ? 0 : (now - t0) / 1000 + off); gl.uniform1f(U(\"uEye\"), eye);",
		"gl.uniform1f(U(\"uT\"), reduce ? 0 : (now - t0) / 1000 + off); gl.uniform1f(U(\"uEye\"), eye);\n\t\t\tgl.uniform1f(U(\"uExpo\"), look.expo); gl.uniform1f(U(\"uVig\"), look.vig);"],
	["async function mount({ canvas, wallSVG, floorCanvas, floorTop, lights, eyes, floorEye }) {", "async function mount({ canvas, wallSVG, floorCanvas, floorTop, lights, eyes, floorEye, look = { expo: 1, vig: 1 } }) {"],
]);

// 2. Caustic placement as uniforms.
patch("glass/floorgl.js", [
	["const float ZC = 3.05, RZ = 1.05;     // pools lie in front of the wall, stretching toward the viewer",
		"uniform float uZC, uRZ, uSpread, uCaus;  // where the pools land, how deep, how divergent, filament strength"],
	["float rx = 290. * P.z, dx = (X - P.x) / rx, dz = (Z - ZC) / RZ;", "float rx = 290. * P.z * uSpread, dx = (X - P.x) / rx, dz = (Z - uZC) / uRZ;"],
	["vec2 uv = vec2(.5 + dx * .48, mix(.96, .14, clamp((ZC + RZ - Z) / (2. * RZ), 0., 1.)));", "vec2 uv = vec2(.5 + dx * .48, mix(.96, .14, clamp((uZC + uRZ - Z) / (2. * uRZ), 0., 1.)));"],
	["return c * P.y * mask * (.55 + .5 * cz);", "return c * P.y * mask * (.55 + uCaus * cz);"],
	["float perp = (Z - ZC) / (RZ * .55);", "float perp = (Z - uZC) / (uRZ * .55);"],
	["gl.uniform4f(U(\"uDrain\"), drain.from, drain.amount, drain.phase, 0);",
		"gl.uniform4f(U(\"uDrain\"), drain.from, drain.amount, drain.phase, 0);\n\t\t\tconst L = state.look; gl.uniform1f(U(\"uZC\"), L.zc); gl.uniform1f(U(\"uRZ\"), L.rz); gl.uniform1f(U(\"uSpread\"), L.spread); gl.uniform1f(U(\"uCaus\"), L.caus);"],
]);

// 3. The page: look state, inward placement, tuner panel.
patch("glass/gathering.html", [
	["const ZC=3.05,homeX=sx=>VX+(sx-VX)*ZF; // a window's centre on the wall, in floor-plane units",
		`// Owner-tunable look (?tune). inward pulls both pools toward the centre; zc is where they land (4 = by the wall, 1 = by you);
// spread is the source distance (lower = light from farther back, tighter projection).
const LOOK={inward:.45,zc:2.5,rz:1.05,spread:.8,caus:.5,expo:1,vig:1};
const ZC=()=>LOOK.zc,homeX=sx=>{const wall=VX+(sx-VX)*ZF;return wall+(VX-wall)*LOOK.inward};`],
	["const FL={A:{x:homeX(97),i:.8,r:1,c:0},B:{x:homeX(293),i:.8,r:1,c:0},drain:{from:0,amount:0,phase:0}};",
		"const FL={A:{x:homeX(97),i:.8,r:1,c:0},B:{x:homeX(293),i:.8,r:1,c:0},drain:{from:0,amount:0,phase:0},look:LOOK};"],
	["const HOME={A:FL.A.x,B:FL.B.x};", "const HOME={A:FL.A.x,B:FL.B.x};\nfunction rehome(){HOME.A=homeX(97);HOME.B=homeX(293);TG.A.x=HOME.A;TG.B.x=HOME.B}"],
	["const POOL_Y=430+FH*((1/ZC-1/ZF)/(1-1/ZF));\nconst poolScreen=X=>[VX+(X-VX)/ZC,POOL_Y];",
		"const poolY=()=>430+FH*((1/ZC()-1/ZF)/(1-1/ZF));\nconst poolScreen=X=>[VX+(X-VX)/ZC(),poolY()];"],
	["const src=w=>key===\"KK\"?[195,POOL_Y]:", "const src=w=>key===\"KK\"?[195,poolY()]:"],
	["env=await ENV.mount({canvas:$(\"#env\"),wallSVG,floorCanvas:$(\"#floor\"),floorTop:430,lights,eyes,floorEye:{x:195,y:430+fy(1.2)}});",
		"env=await ENV.mount({canvas:$(\"#env\"),wallSVG,floorCanvas:$(\"#floor\"),floorTop:430,lights,eyes,floorEye:{x:195,y:430+fy(1.2)},look:LOOK});"],
]);

let s = readFileSync("glass/gathering.html", "utf8");
s = s.replace("</body></html>", `<style>
#tuner{position:fixed;top:16px;left:calc(50% + 215px);width:270px;background:#f4f1ea;color:#1d1b19;border-radius:12px;padding:14px 16px;font:500 13px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:50;user-select:text;touch-action:auto}
#tuner h3{font:700 14px/1.2 system-ui,sans-serif;margin-bottom:6px}#tuner label{display:grid;grid-template-columns:1fr 44px;gap:2px 8px;margin:8px 0}
#tuner label span{font-weight:600}#tuner small{grid-column:1/-1;color:#5c564d;font-size:12px}#tuner output{text-align:right;font-variant-numeric:tabular-nums}
#tuner input{grid-column:1/-1;width:100%;accent-color:#7a3b2a}#tuner button{font:600 12px/1 system-ui;padding:7px 10px;border-radius:7px;border:1px solid #b9b2a6;background:#fff;cursor:pointer;margin-top:6px}
@media (max-width:900px){#tuner{left:auto;right:8px;top:auto;bottom:8px;width:250px;max-height:45vh;overflow:auto}}
</style>
<script>
if(new URLSearchParams(location.search).has("tune")){
 const K=[["inward","Pull toward centre",0,1,.01,"0 = straight below each window, 1 = both at the centre."],["zc","Where it lands",1.2,3.9,.01,"High = by the wall, low = near you."],
  ["spread","Source distance",.3,1.5,.01,"Lower = light from farther back: tighter, less divergent pools."],["rz","Pool depth",.4,2,.01,"How far the pools stretch toward you."],
  ["caus","Filament strength",0,1.5,.01,"Bright caustic lines vs soft wash."],["expo","Scene brightness",.4,1.8,.01,"Overall darkness of the painting."],["vig","Vignette",0,1,.01,"Darkening at the edges."]];
 const box=document.createElement("div");box.id="tuner";box.innerHTML="<h3>Gathering light tuner</h3>"+K.map(([k,l,a,b,st,h])=>\`<label><span>\${l}</span><output id="o-\${k}">\${LOOK[k].toFixed(2)}</output><input type="range" min="\${a}" max="\${b}" step="\${st}" value="\${LOOK[k]}" data-k="\${k}"><small>\${h}</small></label>\`).join("")+'<button id="copy">Copy values</button>';
 document.body.appendChild(box);
 box.addEventListener("pointerdown",e=>e.stopPropagation());
 box.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{LOOK[i.dataset.k]=+i.value;box.querySelector("#o-"+i.dataset.k).textContent=(+i.value).toFixed(2);if(i.dataset.k==="inward")rehome()}));
 box.querySelector("#copy").addEventListener("click",e=>{navigator.clipboard.writeText(JSON.stringify(LOOK));e.target.textContent="Copied: paste it to Claude"});
}
</script>
</body></html>`);
writeFileSync("glass/gathering.html", s);
console.log(s.includes('id="tuner"') || s.includes("tuner") ? "tuner added" : "TUNER MISSING");
