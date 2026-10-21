"use client";

/**
 * The Vestry: three fixed packs of cosmetics for test USDC, and the wardrobe to wear them.
 * Paying is a player op; the pack is added once the payment lands.
 */
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { HAPTIC, play, useSfx } from "@/audio";
import { useApi } from "@/client/api";
import {
	type BuyError,
	BuyFailed,
	type BuyStage,
	buyPack,
	type InventoryState,
	inventory,
	resumeClaims,
	type VestryState,
} from "@/client/inventory";
import { FX, fx } from "@/fx";
import { itemById } from "@/game/reliquary";
import { PACKS, type Pack, type PackId } from "@/game/vestry";
import { itemName, reliquary as R } from "@/lexicon/reliquary";
import { vestry as T } from "@/lexicon/vestry";
import { PrimaryButton } from "@/ui/button";
import { ControlNote } from "@/ui/controls";
import { TabIntro } from "@/ui/intro";
import { DressedMask, useFragmentLook } from "../reliquary/ItemSwatch";
import s from "./vestry.module.css";
import { Wardrobe } from "./Wardrobe";

type Buying = { pack: PackId; stage: BuyStage } | null;
type Notice = { tone: "ok" | "err"; text: string } | null;

const ERR: Record<BuyError, string> = T.errors;

export function VestryScreen() {
	const api = useApi();
	const inv = useMemo(() => inventory(api), [api]);
	const look = useFragmentLook(api);

	const [shop, setShop] = useState<VestryState | null>(null);
	const [wardrobe, setWardrobe] = useState<InventoryState | null>(null);
	const [buying, setBuying] = useState<Buying>(null);
	const [notice, setNotice] = useState<Notice>(null);
	const [down, setDown] = useState(false);
	const sfx = useSfx(["unlock", "seal"]);

	const load = useCallback(async () => {
		try {
			const [v, w] = await Promise.all([inv.vestry(), inv.get()]);
			setShop(v);
			setWardrobe(w);
			setDown(false);
		} catch {
			setDown(true);
		}
	}, [inv]);

	useEffect(() => {
		let live = true;
		load().then(async () => {
			// Payments a closed app left behind: finish them now.
			const done = await resumeClaims(api);
			if (live && done.length > 0) {
				setNotice({ tone: "ok", text: T.bought });
				load();
			}
		});
		return () => {
			live = false;
		};
	}, [api, load]);

	const buy = async (pack: Pack) => {
		if (buying) return;
		setNotice(null);
		setBuying({ pack: pack.id, stage: "paying" });
		try {
			const out = await buyPack(api, pack.id, (stage) =>
				setBuying({ pack: pack.id, stage }),
			);
			setWardrobe(out.inventory);
			setShop((v) =>
				v ? { ...v, owned: [...new Set([...v.owned, out.pack])] } : v,
			);
			setNotice({ tone: "ok", text: T.bought });
			// Bought: the chime, and the pack's mask catches the light.
			sfx.play("unlock");
			sfx.buzz(HAPTIC.unlock);
			const art = document.querySelector(`[data-pack="${pack.id}"]`);
			if (art) {
				fx.burst("sparkle", art, { rarity: "rare", spread: 30 });
				fx.ring(art, FX.gilt, { radius: 110, width: 6 });
			}
			inv
				.vestry()
				.then(setShop)
				.catch(() => {});
		} catch (e) {
			play("error");
			setNotice({
				tone: "err",
				text: e instanceof BuyFailed ? ERR[e.reason] : T.errors.generic,
			});
		} finally {
			setBuying(null);
		}
	};

	return (
		<section className={s.screen}>
			<TabIntro tab="vestry" ready={!!shop || down} />
			<header className={s.head}>
				<h1 className={s.title}>{T.name}</h1>
				{shop?.usdc != null ? (
					<span className={s.balance}>{T.balance(shop.usdc)}</span>
				) : null}
			</header>
			<p className={s.lead}>{T.lead}</p>

			{down ? (
				<p className="banner" role="alert">
					{T.errors.unavailable}
				</p>
			) : null}
			{notice ? (
				<p
					className={notice.tone === "err" ? "banner" : s.ok}
					role={notice.tone === "err" ? "alert" : "status"}
				>
					{notice.text}
				</p>
			) : null}

			<ul className={s.packs}>
				{PACKS.map((p) => (
					<PackCard
						key={p.id}
						pack={p}
						aspect={look.aspect}
						owned={shop?.owned.includes(p.id) ?? false}
						ready={shop != null}
						usdc={shop?.usdc ?? null}
						buying={buying}
						onBuy={() => buy(p)}
					/>
				))}
			</ul>

			{wardrobe ? (
				<Wardrobe
					api={api}
					aspect={look.aspect}
					name={look.name}
					state={wardrobe}
					onChange={setWardrobe}
				/>
			) : null}
		</section>
	);
}

function PackCard({
	pack,
	aspect,
	owned,
	ready,
	usdc,
	buying,
	onBuy,
}: {
	pack: Pack;
	aspect: number;
	owned: boolean;
	ready: boolean;
	/** The account's USDC, when known. */
	usdc: number | null;
	buying: Buying;
	onBuy: () => void;
}) {
	const noteId = useId();
	const mine = buying?.pack === pack.id;
	// Less USDC than the price: the payment would fail. The button stays "Buy · 5 USDC",
	// disabled, and the note says how much is missing (the balance is already in the header).
	const short = usdc != null && usdc < pack.usdc;
	const granting = mine && buying.stage === "granting";
	const label = mine
		? buying.stage === "paying"
			? T.buying
			: T.granting
		: T.buy(pack.usdc);
	const note = granting ? (
		<ControlNote id={noteId} tone="gilt">
			{T.paid}
		</ControlNote>
	) : short ? (
		<ControlNote id={noteId} tone="warn">
			{T.short(pack.usdc - usdc)}
		</ControlNote>
	) : null;
	return (
		<li className={s.pack} data-owned={owned ? "1" : "0"}>
			<div className={s.packArt} data-pack={pack.id}>
				<DressedMask aspect={aspect} equipped={pack.preview} size={76} glow />
			</div>
			<div className={s.packBody}>
				<h2 className={s.packName}>{T.packs[pack.id].name}</h2>
				<ul className={s.contents} aria-label={T.contains}>
					{pack.items.map((id) => {
						const it = itemById(id);
						return (
							<li key={id}>
								<span className={s.contentName}>{itemName(id)}</span>
								{it ? (
									<span className={s.contentKind}>{R.kind[it.kind]}</span>
								) : null}
							</li>
						);
					})}
				</ul>
				{owned ? (
					<p className={s.owned}>{T.owned}</p>
				) : (
					<>
						<PrimaryButton
							legacy={s.buy}
							className={s.buyFit}
							size="md"
							disabled={!ready || short || buying !== null}
							aria-busy={mine}
							aria-describedby={note ? noteId : undefined}
							loading={mine}
							onClick={onBuy}
						>
							{label}
						</PrimaryButton>
						{note}
					</>
				)}
			</div>
		</li>
	);
}
