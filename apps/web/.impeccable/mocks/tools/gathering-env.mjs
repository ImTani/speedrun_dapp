// Wire the painted environment (envgl.js) into the Gathering.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/gathering.html";
let s = readFileSync(file, "utf8");
const missing = [];
const rep = (a, b) => { if (!s.includes(a)) missing.push(a.slice(0, 80)); s = s.replace(a, b); };

rep(`<body>\n<div id="wall">`, `<body>\n<canvas id="env"></canvas>\n<div id="wall">`);
rep(`body{background:#0c0a10}`, `body{background:#0a080c}
#env{position:absolute;left:0;top:0;width:390px;height:844px}
body.painted #ashlar,body.painted .niche svg.emb,body.painted #floor{visibility:hidden}
body.painted .band{background:transparent;box-shadow:none}
body.painted .plaque{filter:brightness(.78) contrast(1.05) saturate(.85)}
body.painted .sill{color:#6f6352}
#grain{position:absolute;inset:0;width:390px;height:844px;pointer-events:none;z-index:8;mix-blend-mode:overlay;opacity:.22}
.vign{position:absolute;inset:0;pointer-events:none;z-index:8;background:radial-gradient(120% 95% at 50% 46%,transparent 55%,rgba(6,4,8,.6) 100%)}`);
rep(`<script src="floorgl.js"></script>`, `<script src="floorgl.js"></script><script src="envgl.js"></script>`);
rep(`<div class="whisper" id="whisper">`, `<canvas id="grain"></canvas><div class="vign"></div>\n<div class="whisper" id="whisper">`);

// A closed brass eye inlaid at the centre of the compass.
rep(`const g=x.createLinearGradient(0,0,0,70);g.addColorStop(0,"rgba(0,0,0,.65)");`,
	`x.strokeStyle="rgba(201,164,90,.6)";x.lineWidth=1.4;x.beginPath();x.moveTo(195-30,cy);x.quadraticCurveTo(195,cy-11,195+30,cy);x.quadraticCurveTo(195,cy+11,195-30,cy);x.stroke();x.beginPath();x.moveTo(195-30,cy);x.lineTo(195+30,cy);x.stroke();
 const g=x.createLinearGradient(0,0,0,70);g.addColorStop(0,"rgba(0,0,0,.65)");`);

// Mount the painting once the wall, embrasures and floor exist (just before the votive racks are built).
rep(`/* ---------- Votive racks ---------- */`, `/* ---------- Painted environment: chiaroscuro + Kuwahara + grade (envgl.js) ---------- */
let env=null;
(async()=>{try{
 const wallSVG=\`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="430" viewBox="0 0 390 430">\${$("#ashlar").innerHTML}<g transform="translate(12,66)">\${$("#eOpp").innerHTML}</g><g transform="translate(208,66)">\${$("#eYou").innerHTML}</g><rect x="62" y="14" width="226" height="38" fill="#0d0a10"/><rect x="62" y="14" width="226" height="3" fill="#050407"/></svg>\`;
 const lights=[{x:97,y:180,r:175,color:[176,140,206],a:.95},{x:293,y:180,r:175,color:[222,140,118],a:.95},
  {x:97,y:345,r:95,color:[255,170,92],a:.55},{x:293,y:345,r:95,color:[255,170,92],a:.55},
  {x:97,y:500,r:150,color:[160,120,190],a:.5},{x:293,y:500,r:150,color:[210,120,110],a:.5},{x:195,y:640,r:170,color:[120,90,130],a:.25}];
 const eyes=[{x:40,y:68,phase:3,period:17},{x:356,y:96,phase:11,period:13},{x:195,y:59,phase:7,period:19},{x:22,y:478,phase:1,period:15},
  {x:370,y:500,phase:9,period:11},{x:34,y:792,phase:5,period:21},{x:360,y:770,phase:13,period:16}];
 env=await ENV.mount({canvas:$("#env"),wallSVG,floorCanvas:$("#floor"),floorTop:430,lights,eyes,floorEye:{x:195,y:430+fy(1.2)}});
 if(env)document.body.classList.add("painted");
}catch(e){console.error(e)}})();
/* ---------- Canvas grain over everything, so the brass and glass sit in the same painting ---------- */
(function(){const c=$("#grain"),x=c.getContext("2d");c.width=130;c.height=282;const im=x.createImageData(130,282);
 (function tick(){for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}x.putImageData(im,0,0);if(!reduce)setTimeout(tick,90)})()})();
/* ---------- Votive racks ---------- */`);

// The floor eye parts when something devours.
rep(`if(key==="KK"){TG.A.x=VX-150;`, `if(key!=="KK")env?.eye(key==="DD"?.55:1);\n if(key==="KK"){TG.A.x=VX-150;`);
rep(`resetFloor();for(const w of ["you","opp"]){api[w]?.red(0);api[w]?.dim(0)}["#pYou","#pOpp"]`, `resetFloor();env?.eye(0);for(const w of ["you","opp"]){api[w]?.red(0);api[w]?.dim(0)}["#pYou","#pOpp"]`);

writeFileSync(file, s);
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "painted environment wired");
