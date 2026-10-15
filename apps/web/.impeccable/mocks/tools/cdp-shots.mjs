// Real-time screenshots of a mock via the Chrome DevTools Protocol (no virtual time, so rAF,
// CSS/WAAPI animations and WebGL run at real speed). Usage:
//   node cdp-shots.mjs <url> <outPrefix> <ms,ms,...> [width] [height]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, out, times, w = "390", h = "844"] = process.argv.slice(2);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, [
	"--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "cdp-"))}`,
	"--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars", "--no-first-run", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
	await sleep(200);
	try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
if (!target) { chrome.kill(); throw new Error("Chrome DevTools endpoint not reachable"); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map(), logs = [];
ws.addEventListener("message", (e) => {
	const m = JSON.parse(e.data);
	if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
	if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) logs.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`);
	if (m.method === "Runtime.exceptionThrown") logs.push(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 2, mobile: true });
const t0 = Date.now();
await send("Page.navigate", { url });
for (const ms of times.split(",").map(Number)) {
	const wait = ms - (Date.now() - t0);
	if (wait > 0) await sleep(wait);
	const shot = await send("Page.captureScreenshot", { format: "png" });
	writeFileSync(`${out}-${ms}.png`, Buffer.from(shot.result.data, "base64"));
	console.log(`shot ${out}-${ms}.png`);
}
console.log(logs.length ? logs.join("\n") : "console: clean");
ws.close();
chrome.kill();
