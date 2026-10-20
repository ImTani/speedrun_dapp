/**
 * Web push: tells every subscribed player when a Gathering opens. Polls the indexed BoutOpened events
 * (so it works whoever opened the Gathering), records each announced Gathering in `push_announced` so
 * a restart never repeats it, and prunes subscriptions the push service reports gone (404/410).
 * Needs VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_SUBJECT in the root .env.
 */
import { createRequire } from "node:module";
// Player-facing words live in the web app's lexicon (pure data, no imports).
import { marks as M } from "../../web/src/lexicon/marks.ts";
import { CHAIN_ID, sql } from "./db.ts";

interface PushSubscription {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}
/** The slice of the `web-push` package used here (the runner has no @types/web-push). */
interface WebPush {
	setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
	sendNotification(
		sub: PushSubscription,
		payload: string,
		opts?: {
			TTL?: number;
			urgency?: "very-low" | "low" | "normal" | "high";
			topic?: string;
		},
	): Promise<unknown>;
}

/** Only Gatherings opened this recently are announced (none of the backlog on a first start). */
const FRESH_MINUTES = 15;
const PARALLEL = 20;

let webpush: WebPush | null | undefined;
function client(): WebPush | null {
	if (webpush !== undefined) return webpush;
	const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
	const priv = process.env.VAPID_PRIVATE_KEY;
	const subject = process.env.VAPID_SUBJECT || "mailto:ops@smoothsend.xyz";
	if (!pub || !priv) {
		console.log("notify: VAPID keys not set; push is off");
		webpush = null;
		return null;
	}
	const wp = createRequire(import.meta.url)("web-push") as WebPush;
	wp.setVapidDetails(subject, pub, priv);
	webpush = wp;
	return wp;
}

interface Target {
	endpoint: string;
	p256dh: string;
	auth: string;
	/** The subscriber's Fragment name when it fights in this Gathering. */
	fighter: string | null;
}

/** One tick: announces each newly opened Gathering once. */
export async function notifyTick() {
	const wp = client();
	if (!wp) return;
	const opened = (await sql`select e.gathering::text as gathering, e.data
		from arena_events e
		where e.chain_id = ${CHAIN_ID} and e.name = 'BoutOpened'
			and e.at > now() - make_interval(mins => ${FRESH_MINUTES})
			and not exists (select 1 from push_announced a
				where a.chain_id = e.chain_id and a.gathering = e.gathering)
		order by e.block`) as { gathering: string; data: { agents?: string[] } }[];
	for (const g of opened) {
		// Claim it first: if two runners overlap, only one announces.
		const claimed = await sql`insert into push_announced (chain_id, gathering)
			values (${CHAIN_ID}, ${g.gathering}) on conflict do nothing returning gathering`;
		if (!claimed.length) continue;
		const agents = (g.data.agents ?? []).map((a) => a.toLowerCase());
		const targets = (await sql`select s.endpoint, s.p256dh, s.auth,
				case when lower(f.agent) = any(${agents}::text[]) then f.name end as fighter
			from push_subscriptions s
			left join players p on p.privy_id = s.privy_id
			left join fragments f on f.chain_id = ${CHAIN_ID} and lower(f.owner_account) = lower(p.account)`) as Target[];
		const sent = await announce(wp, g.gathering, targets);
		await sql`update push_announced set sent = ${sent}
			where chain_id = ${CHAIN_ID} and gathering = ${g.gathering}`;
		console.log(
			`notify: Gathering ${g.gathering} announced to ${sent}/${targets.length}`,
		);
	}
}

async function announce(wp: WebPush, gathering: string, targets: Target[]) {
	const delivered: string[] = [];
	const gone: string[] = [];
	for (let i = 0; i < targets.length; i += PARALLEL) {
		const chunk = targets.slice(i, i + PARALLEL);
		const results = await Promise.allSettled(
			chunk.map((t) =>
				wp.sendNotification(
					{ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
					JSON.stringify({
						title: M.push.openTitle,
						body: t.fighter ? M.push.openBodyYours(t.fighter) : M.push.openBody,
						url: "/play?tab=gathering",
						tag: `gathering-${gathering}`,
					}),
					{ TTL: 30 * 60, urgency: "high", topic: "gathering" },
				),
			),
		);
		results.forEach((r, j) => {
			const t = chunk[j] as Target;
			if (r.status === "fulfilled") {
				delivered.push(t.endpoint);
				return;
			}
			const status = (r.reason as { statusCode?: number } | null)?.statusCode;
			if (status === 404 || status === 410) gone.push(t.endpoint);
		});
	}
	if (delivered.length) {
		await sql`update push_subscriptions set last_sent_at = now()
			where endpoint = any(${delivered}::text[])`;
	}
	if (gone.length) {
		await sql`delete from push_subscriptions where endpoint = any(${gone}::text[])`;
		console.log(`notify: pruned ${gone.length} expired subscriptions`);
	}
	return delivered.length;
}
