// Swap the Gathering's 2D light layer (pools, shafts, dotted drain) for the caustic floor shader.
import { readFileSync, writeFileSync } from "node:fs";

const file = "glass/gathering.html";
let s = readFileSync(file, "utf8");
const missing = [];
const rep = (a, b) => { if (!s.includes(a)) missing.push(a.slice(0, 80)); s = s.replace(a, b); };

// Markup + CSS
rep(`<canvas class="caus" id="causOpp"></canvas><canvas class="caus" id="causYou"></canvas>\n<canvas id="light"></canvas>`, `<canvas id="floorLight"></canvas>`);
rep(`.caus{position:absolute;left:0;top:430px;width:390px;height:414px;mix-blend-mode:screen;pointer-events:none;opacity:.6}\n#light{position:absolute;inset:0;width:390px;height:844px;pointer-events:none;mix-blend-mode:screen;z-index:3}`,
	`#floorLight{position:absolute;left:0;top:430px;width:390px;height:414px;pointer-events:none;mix-blend-mode:screen;z-index:3}`);
rep(`<script src="glass.js"></script><script src="glassgl.js"></script><script src="masks.js"></script>`, `<script src="glass.js"></script><script src="glassgl.js"></script><script src="masks.js"></script><script src="floorgl.js"></script>`);

// Windows no longer own caustic canvases; the floor shader carries their light.
rep(`const a=await GL.mount({winCanvas:$(\`#\${id}Gl\`),causticCanvas:$(id==="you"?"#causYou":"#causOpp"),theme,seed,causticBoost:2.4,causticReach:2.6,causticFloor:true});`,
	`const a=await GL.mount({winCanvas:$(\`#\${id}Gl\`),theme,seed});`);

// Replace the whole 2D light layer with floor-light state driven toward targets each frame.
const start = s.indexOf("/* ---------- Light on the floor:");
const end = s.indexOf("/* ---------- Embers:");
if (start < 0 || end < 0) missing.push("light layer block");
else s = s.slice(0, start) + `/* ---------- Light on the floor: each window's glass as caustic light on the marble (floorgl.js) ---------- */
const ZC=3.05,homeX=sx=>VX+(sx-VX)*ZF; // a window's centre on the wall, in floor-plane units
const FL={A:{x:homeX(97),i:.8,r:1,c:0},B:{x:homeX(293),i:.8,r:1,c:0},drain:{from:0,amount:0,phase:0}};
const TG={A:{...FL.A},B:{...FL.B},drain:0};
const HOME={A:FL.A.x,B:FL.B.x};
const key2=w=>w==="opp"?"A":"B";
function updateFloor(dt){const k=Math.min(1,dt*3.2);for(const P of ["A","B"])for(const f of ["x","i","r","c"])FL[P][f]+=(TG[P][f]-FL[P][f])*k;
 FL.drain.amount+=(TG.drain-FL.drain.amount)*Math.min(1,dt*2.5);FL.drain.phase+=dt*(FL.drain.amount>.01?1:0)}
function resetFloor(){for(const P of ["A","B"]){TG[P].x=HOME[P];TG[P].i=.8;TG[P].r=1;TG[P].c=0}TG.drain=0}
FLOOR.mount({canvas:$("#floorLight"),a:{theme:"marrow",seed:23},b:{theme:"vesper",seed:13},zf:ZF,vx:VX,state:FL}).catch(e=>console.error(e));
const POOL_Y=430+FH*((1/ZC-1/ZF)/(1-1/ZF));
const poolScreen=X=>[VX+(X-VX)/ZC,POOL_Y];
` + s.slice(end);

// Ember loop drives the floor state instead of drawing 2D light; embers become sparks, not glowing balls.
rep(`(function loop(n){const dt=Math.min(.05,(n-lastT)/1000)*speed;lastT=n;drawLight(dt);`, `(function loop(n){const dt=Math.min(.05,(n-lastT)/1000)*speed;lastT=n;updateFloor(dt);`);
rep("g=ex.createRadialGradient(x,y,0,x,y,11);g.addColorStop(0,`rgba(255,248,225,${fl})`);g.addColorStop(.28,`rgba(${p.col},${.85*fl})`);g.addColorStop(1,`rgba(${p.col},0)`);\n   ex.fillStyle=g;ex.beginPath();ex.arc(x,y,11,0,6.28);",
	"g=ex.createRadialGradient(x,y,0,x,y,6);g.addColorStop(0,`rgba(255,248,225,${fl})`);g.addColorStop(.35,`rgba(${p.col},${.7*fl})`);g.addColorStop(1,`rgba(${p.col},0)`);\n   ex.fillStyle=g;ex.beginPath();ex.arc(x,y,6,0,6.28);");

// Turn grammar: drive the floor targets.
rep(`const poolPt=w=>[pools[w].x,POOL_Y-4];`, `const poolPt=w=>poolScreen(FL[key2(w)].x);`);
rep(`for(const w of ["you","opp"]){pools[w].ta=.45;api[w]?.dim(.25)}`, `for(const w of ["you","opp"]){TG[key2(w)].i=.45;api[w]?.dim(.25)}`);
rep(`for(const [w,c] of [["you",y],["opp",o]]){api[w]?.dim(0);pools[w].ta=.9;if(c==="K"){api[w]?.swell();pools[w].trx=118}else{api[w]?.red(1);pools[w].tcrim=1}enamel(w,c)}`,
	`for(const [w,c] of [["you",y],["opp",o]]){const P=TG[key2(w)];api[w]?.dim(0);P.i=1;if(c==="K"){api[w]?.swell();P.i=1.25;P.r=1.15}else{api[w]?.red(1);P.c=1}enamel(w,c)}`);
rep(`if(key==="KK"){pools.opp.tx=165;pools.you.tx=225;pools.opp.ta=pools.you.ta=1.25;pools.opp.trx=pools.you.trx=126}`,
	`if(key==="KK"){TG.A.x=VX-150;TG.B.x=VX+150;TG.A.i=TG.B.i=1.45;TG.A.r=TG.B.r=1.2}`);
rep(`if(key==="KD"){drain={from:"you",to:"opp",t:0};pools.you.ta=.22;pools.you.trx=56;pools.opp.ta=1.35;pools.opp.trx=130;`,
	`if(key==="KD"){FL.drain.from=1;TG.drain=1;TG.B.i=.25;TG.B.r=.7;TG.A.i=1.5;TG.A.r=1.2;TG.A.c=1;`);
rep(`if(key==="DK"){drain={from:"opp",to:"you",t:0};pools.opp.ta=.22;pools.opp.trx=56;pools.you.ta=1.35;pools.you.trx=130;`,
	`if(key==="DK"){FL.drain.from=0;TG.drain=1;TG.A.i=.25;TG.A.r=.7;TG.B.i=1.5;TG.B.r=1.2;TG.B.c=1;`);
rep(`if(key==="DD"){pools.you.ta=pools.opp.ta=.5;pools.you.trx=pools.opp.trx=70;`, `if(key==="DD"){TG.A.i=TG.B.i=.5;TG.A.r=TG.B.r=.8;TG.A.c=TG.B.c=.7;`);
rep(`const src=w=>key==="KK"?[195,POOL_Y-6]:poolPt(key==="DD"?w:(key==="KD"?"opp":"you"));`, `const src=w=>key==="KK"?[195,POOL_Y]:poolPt(key==="DD"?w:(key==="KD"?"opp":"you"));`);
rep(`drain=null;rd.classList.remove("now");`, `TG.drain=0;rd.classList.remove("now");`);
rep(`for(const w of ["you","opp"]){const p=pools[w];p.tx=p.home;p.ta=.8;p.trx=92;p.tcrim=0;api[w]?.red(0);api[w]?.dim(0)}["#pYou","#pOpp"]`,
	`resetFloor();for(const w of ["you","opp"]){api[w]?.red(0);api[w]?.dim(0)}["#pYou","#pOpp"]`);
rep(`function finish(){skipped=true;gen++;parts=[];drain=null;`, `function finish(){skipped=true;gen++;parts=[];resetFloor();`);
rep(`for(const w of ["you","opp"]){const p=pools[w];p.tx=p.home;p.ta=.8;p.trx=92;p.tcrim=0;api[w]?.red(0);api[w]?.dim(0)}\n document.querySelectorAll(".rd")`,
	`for(const w of ["you","opp"]){api[w]?.red(0);api[w]?.dim(0)}\n document.querySelectorAll(".rd")`);

writeFileSync(file, s);
const leftovers = ["pools[", "drawLight", "drain={", "causYou"].filter((k) => s.includes(k));
console.log(missing.length ? `MISSING:\n${missing.join("\n")}` : "floor light swapped in", leftovers.length ? `\nLEFTOVER refs: ${leftovers.join(", ")}` : "");
