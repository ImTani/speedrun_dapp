import { CHAIN_ID } from "@/server/chain.ts";
import { db } from "@/server/db.ts";
import { handle, json } from "@/server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
	const rows = (await db()`select l.agent, f.name, f.config::text as config,
			l.light::text as light, l.duels::text as duels
		from light l
		join fragments f on f.chain_id = l.chain_id and lower(f.agent) = lower(l.agent)
		where l.chain_id = ${CHAIN_ID}
		order by l.light desc, l.duels desc
		limit 100`) as {
		agent: string;
		name: string;
		config: string;
		light: string;
		duels: string;
	}[];
	return json({
		rows: rows.map((r) => ({
			agent: r.agent,
			name: r.name,
			aspect: Number(BigInt(r.config) & 0xffn),
			light: Number(r.light),
			duels: Number(r.duels),
		})),
	});
});
