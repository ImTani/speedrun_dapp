"use client";

import {
	DEFAULT_KNOBS,
	decodeConfig,
	encodeConfig,
	type Knobs,
	STRATEGY_KNOBS,
	type StrategyId,
} from "@arena/strategies";
import { useCallback, useEffect, useState } from "react";
import {
	ApiError,
	type FragmentRow,
	type Me,
	type StandingRow,
	useApi,
} from "@/client/api";
import { L } from "@/lexicon";
import { GlassWindow } from "@/ui/GlassWindow";
import { Mask } from "@/ui/Mask";
import { SigilEditor, sigilValue } from "./SigilEditor";

type Api = ReturnType<typeof useApi>;

const errText = (e: unknown) =>
	e instanceof ApiError && e.status === 503
		? L.errors.unavailable
		: L.errors.generic;

export function FragmentScreen() {
	const api = useApi();
	const [me, setMe] = useState<Me | null>(null);
	const [err, setErr] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			setMe(await api.me());
			setErr(null);
		} catch (e) {
			setErr(
				e instanceof ApiError && e.status === 503
					? L.errors.unavailable
					: L.errors.noVoice,
			);
		}
	}, [api]);

	useEffect(() => {
		refresh();
		const t = setInterval(refresh, 5000);
		return () => clearInterval(t);
	}, [refresh]);

	if (!me) {
		return (
			<section className="screen center">
				<p className="prose pulse">{err ?? L.entering}</p>
			</section>
		);
	}
	const f = me.fragment;
	return (
		<section className="screen">
			{err && <p className="banner">{err}</p>}
			{!f && <BindFlow api={api} onDone={refresh} />}
			{f && f.status !== "confirmed" && (
				<Pending api={api} fragment={f} onDone={refresh} />
			)}
			{f && f.status === "confirmed" && (
				<Hero
					api={api}
					fragment={f}
					boutActive={me.boutActive}
					onDone={refresh}
				/>
			)}
		</section>
	);
}

function aspectOf(f: FragmentRow): { aspect: number; knobs: Knobs } {
	try {
		const c = decodeConfig(BigInt(f.config));
		return { aspect: c.strategy, knobs: c.knobs };
	} catch {
		return { aspect: 6, knobs: DEFAULT_KNOBS };
	}
}

function BindFlow({ api, onDone }: { api: Api; onDone: () => void }) {
	const [aspect, setAspect] = useState(2);
	const [step, setStep] = useState<"mask" | "sigils">("mask");
	const [knobs, setKnobs] = useState<Knobs>(DEFAULT_KNOBS);
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const a = L.aspects[aspect];

	const submit = async () => {
		setBusy(true);
		setErr(null);
		try {
			const config = encodeConfig({
				strategy: aspect as StrategyId,
				knobs,
			}).toString();
			await api.createFragment(name.trim(), config);
			onDone();
		} catch (e) {
			setErr(errText(e));
			setBusy(false);
		}
	};

	if (step === "mask") {
		return (
			<div className="bind">
				<h1 className="lettering">{L.bind.heading}</h1>
				<p className="kicker">{L.bind.chooseAspect}</p>
				<GlassWindow aspect={aspect} height={250}>
					<Mask aspect={aspect} width={110} />
				</GlassWindow>
				<h2 className="aspect-name">
					{a?.name} <span className="aspect-mask">· {a?.mask}</span>
				</h2>
				<p className="prose">{a?.blurb}</p>
				<div className="mask-row">
					{L.aspects.map((x, i) => (
						<button
							key={x.key}
							type="button"
							className={`mask-pick${i === aspect ? " on" : ""}`}
							onClick={() => setAspect(i)}
							aria-label={x.name}
						>
							<Mask aspect={i} width={40} />
						</button>
					))}
				</div>
				<button
					type="button"
					className="btn btn-blood"
					onClick={() => setStep("sigils")}
				>
					{L.bind.next}
				</button>
			</div>
		);
	}

	const trimmed = name.trim();
	const nameOk = trimmed.length >= 1 && trimmed.length <= 24;
	return (
		<div className="bind">
			<div className="bind-head">
				<Mask aspect={aspect} width={56} />
				<div>
					<h2 className="aspect-name">{a?.name}</h2>
					<p className="kicker">{L.bind.sigilsHeading}</p>
				</div>
			</div>
			<SigilEditor
				aspect={aspect}
				knobs={knobs}
				onChange={setKnobs}
				disabled={busy}
			/>
			<label className="name-field">
				<span className="kicker">{L.bind.nameLabel}</span>
				<input
					value={name}
					maxLength={24}
					placeholder={L.bind.namePlaceholder}
					onChange={(e) => setName(e.target.value)}
					disabled={busy}
				/>
			</label>
			{err && <p className="banner">{err}</p>}
			<div className="row">
				<button
					type="button"
					className="btn btn-ghost"
					onClick={() => setStep("mask")}
					disabled={busy}
				>
					{L.bind.back}
				</button>
				<button
					type="button"
					className="btn btn-blood"
					onClick={submit}
					disabled={busy || !nameOk}
				>
					{busy ? L.bind.binding : L.bind.submit}
				</button>
			</div>
		</div>
	);
}

function Pending({
	api,
	fragment,
	onDone,
}: {
	api: Api;
	fragment: FragmentRow;
	onDone: () => void;
}) {
	const { aspect } = aspectOf(fragment);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	const seal = async () => {
		setBusy(true);
		setErr(null);
		try {
			const ok = await api.runPlayerOp({ action: "confirm" });
			if (!ok) setErr(L.status.sealFailed);
			onDone();
		} catch {
			setErr(L.status.sealFailed);
		} finally {
			setBusy(false);
		}
	};

	const s = fragment.status;
	return (
		<div className="pending">
			<GlassWindow aspect={aspect} dim={s !== "registered"} height={300}>
				<Mask aspect={aspect} width={100} />
			</GlassWindow>
			<h1 className="lettering frag-name">{fragment.name}</h1>
			{s === "requested" && (
				<>
					<p className="kicker pulse">{L.status.requested}</p>
					<p className="prose dim">{L.status.requestedHint}</p>
				</>
			)}
			{s === "registered" && (
				<>
					<p className="kicker">
						{busy ? L.status.sealing : L.status.registered}
					</p>
					<p className="prose dim">
						{busy ? L.status.sealingHint : L.status.registeredHint}
					</p>
					<button
						type="button"
						className={`btn btn-blood btn-seal${busy ? " pulse" : ""}`}
						onClick={seal}
						disabled={busy}
					>
						{busy ? L.status.sealing : L.status.seal}
					</button>
				</>
			)}
			{s === "failed" && (
				<>
					<p className="kicker blood">{L.status.failed}</p>
					<p className="prose dim">{L.status.failedHint}</p>
				</>
			)}
			{err && <p className="banner">{err}</p>}
		</div>
	);
}

function Hero({
	api,
	fragment,
	boutActive,
	onDone,
}: {
	api: Api;
	fragment: FragmentRow;
	boutActive: boolean;
	onDone: () => void;
}) {
	const { aspect, knobs } = aspectOf(fragment);
	const [row, setRow] = useState<StandingRow | null>(null);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<Knobs>(knobs);
	const [busy, setBusy] = useState(false);
	const [note, setNote] = useState<string | null>(null);
	const keys = STRATEGY_KNOBS[aspect as StrategyId] ?? [];

	useEffect(() => {
		const agent = fragment.agent?.toLowerCase();
		const load = () =>
			api
				.standings()
				.then((r) =>
					setRow(r.rows.find((x) => x.agent.toLowerCase() === agent) ?? null),
				)
				.catch(() => {});
		load();
		const t = setInterval(load, 15000);
		return () => clearInterval(t);
	}, [api, fragment.agent]);

	const retune = async () => {
		setBusy(true);
		setNote(null);
		try {
			const config = encodeConfig({
				strategy: aspect as StrategyId,
				knobs: draft,
			}).toString();
			const ok = await api.runPlayerOp({ action: "retune", config });
			setNote(ok ? L.hero.retuneDone : L.hero.retuneFailed);
			if (ok) setEditing(false);
			onDone();
		} catch {
			setNote(L.hero.retuneFailed);
		} finally {
			setBusy(false);
		}
	};

	const a = L.aspects[aspect];
	return (
		<div className="hero">
			<GlassWindow aspect={aspect} height={320}>
				<Mask aspect={aspect} width={110} />
			</GlassWindow>
			<h1 className="lettering frag-name">{fragment.name}</h1>
			<p className="kicker">
				{a?.name} · {a?.mask} · {L.status.confirmed}
			</p>
			<div className="plaques">
				<div className="plaque">
					<span className="plaque-num">{row?.light ?? 0}</span>
					<span className="plaque-label">{L.hero.light}</span>
				</div>
				<div className="plaque">
					<span className="plaque-num">{row?.duels ?? 0}</span>
					<span className="plaque-label">{L.hero.duels}</span>
				</div>
			</div>
			{keys.length > 0 && !editing && (
				<div className="sigil-chips">
					{keys.map((k) => (
						<span key={k} className="chip">
							{L.sigils[k].name} <b>{sigilValue(k, knobs[k])}</b>
						</span>
					))}
				</div>
			)}
			{keys.length > 0 &&
				(boutActive ? (
					<p className="prose dim locked">{L.hero.retuneLocked}</p>
				) : editing ? (
					<div className="retune">
						<SigilEditor
							aspect={aspect}
							knobs={draft}
							onChange={setDraft}
							disabled={busy}
						/>
						<div className="row">
							<button
								type="button"
								className="btn btn-ghost"
								disabled={busy}
								onClick={() => setEditing(false)}
							>
								{L.hero.cancel}
							</button>
							<button
								type="button"
								className="btn btn-blood"
								disabled={busy}
								onClick={retune}
							>
								{busy ? L.hero.retuning : L.hero.retuneApply}
							</button>
						</div>
					</div>
				) : (
					<button
						type="button"
						className="btn btn-ghost"
						onClick={() => {
							setDraft(knobs);
							setEditing(true);
						}}
					>
						{L.hero.retune}
					</button>
				))}
			{note && <p className="banner">{note}</p>}
		</div>
	);
}
