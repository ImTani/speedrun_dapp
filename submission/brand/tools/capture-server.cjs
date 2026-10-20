// One headless Chromium, reused for every brand/listing capture.
//
//   NODE_PATH=<dir with playwright>/node_modules node capture-server.cjs [port]
//   curl -s localhost:3299/shot -d '{"url":"...","out":"...","w":512,"h":512,"dsf":1}'
//   curl -s localhost:3299/quit
//
// Job fields: url, out (absolute PNG path), w, h, dsf (device scale), clear (omitBackground),
// reduce (prefers-reduced-motion), ready (CSS selector to wait for), wait (extra ms after it),
// shots (dir served at /brandshot/<name>.png, for the listing frames), css (extra style),
// eval + after (run a script, then wait), dump + dumpOut (write an element's text to a file).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const PORT = Number(process.argv[2] || 3299);

(async () => {
	const browser = await chromium.launch({
		channel: "chromium", // the full Chromium in new headless mode, not headless-shell
		headless: true,
		args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
	});
	let busy = Promise.resolve();

	async function shot(job) {
		const ctx = await browser.newContext({
			viewport: { width: job.w, height: job.h },
			deviceScaleFactor: job.dsf || 1,
			reducedMotion: job.reduce === false ? "no-preference" : "reduce",
			colorScheme: "dark",
		});
		const page = await ctx.newPage();
		const logs = [];
		page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
		if (job.shots)
			await page.route("**/brandshot/*.png", (route) => {
				const name = path.basename(new URL(route.request().url()).pathname);
				route.fulfill({
					path: path.join(job.shots, name),
					contentType: "image/png",
				});
			});
		try {
			await page.goto(job.url, { waitUntil: "load", timeout: 120000 });
			if (job.ready)
				await page.waitForSelector(job.ready, {
					state: "attached",
					timeout: 60000,
				});
			// The dev overlay's badge never belongs in a capture.
			await page
				.addStyleTag({
					content: `nextjs-portal{display:none!important}${job.css || ""}`,
				})
				.catch(() => {}); // not an HTML page (e.g. an SVG file)
			await page.waitForTimeout(job.wait ?? 1500);
			if (job.eval) await page.evaluate(job.eval);
			if (job.after) await page.waitForTimeout(job.after);
			if (job.dump) {
				const text = await page.$eval(
					job.dump,
					(el) => el.value ?? el.textContent,
				);
				fs.writeFileSync(job.dumpOut, text);
			}
			if (!job.out) return { ok: true, logs };
			fs.mkdirSync(path.dirname(job.out), { recursive: true });
			await page.screenshot({
				path: job.out,
				omitBackground: !!job.clear,
				animations: job.freeze ? "disabled" : "allow",
			});
			return { ok: true, out: job.out, logs };
		} catch (e) {
			return { ok: false, error: String(e), logs };
		} finally {
			await ctx.close();
		}
	}

	const server = http.createServer((req, res) => {
		let body = "";
		req.on("data", (c) => {
			body += c;
		});
		req.on("end", async () => {
			if (req.url === "/quit") {
				res.end("bye\n");
				await busy;
				await browser.close();
				server.close();
				process.exit(0);
			}
			const job = JSON.parse(body || "{}");
			const run = busy.then(() => shot(job));
			busy = run.catch(() => {});
			const r = await run;
			res.setHeader("content-type", "application/json");
			res.end(`${JSON.stringify(r)}\n`);
		});
	});
	server.listen(PORT, "127.0.0.1", () =>
		console.log(`capture server on ${PORT}`),
	);
})();
