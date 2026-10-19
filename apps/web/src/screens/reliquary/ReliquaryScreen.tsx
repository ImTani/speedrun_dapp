"use client";

/**
 * The Reliquary: spend Ash to scry one cosmetic. A face-down card flips to show what came;
 * duplicates give Ash back. Recent Scryings sit below.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, useApi } from "@/client/api";
import {
	type InventoryState,
	inventory,
	type ReliquaryState,
} from "@/client/inventory";
import { itemById, type ScryResult } from "@/game/reliquary";
import { itemName, reliquary as T } from "@/lexicon/reliquary";
import { haptic, pressable } from "@/ui/motion";
import { Count, Rubric } from "@/ui/type";
import { DressedMask, ItemSwatch, useFragmentLook } from "./ItemSwatch";
import s from "./reliquary.module.css";

type Card =
	| { state: "idle" }
	| { state: "scrying" }
	| { state: "shown"; result: ScryResult };

export function ReliquaryScreen() {
	const api = useApi();
	const inv = useMemo(() => inventory(api), [api]);
	const look = useFragmentLook(api);
	const reduce = useReducedMotion() ?? false;

	const [state, setState] = useState<ReliquaryState | null>(null);
	const [wardrobe, setWardrobe] = useState<InventoryState | null>(null);
	const [card, setCard] = useState<Card>({ state: "idle" });
	const [err, setErr] = useState<string | null>(null);
	const [wearing, setWearing] = useState(false);

	const load = useCallback(async () => {
		try {
			const [r, w] = await Promise.all([inv.reliquary(), inv.get()]);
			setState(r);
			setWardrobe(w);
			setErr(null);
		} catch {
			setErr(T.errors.unavailable);
		}
	}, [inv]);

	useEffect(() => {
		load();
	}, [load]);

	const doScry = async () => {
		if (!state || card.state === "scrying") return;
		setErr(null);
		setCard({ state: "scrying" });
		try {
			const [out] = await Promise.all([
				inv.scry(),
				new Promise((r) => setTimeout(r, reduce ? 0 : 650)),
			]);
			setState((st) =>
				st
					? {
							...st,
							ash: out.ash,
							pityLeft: out.pityLeft,
							recent: [out.result, ...st.recent].slice(0, 10),
						}
					: st,
			);
			if (!out.result.duplicate)
				setWardrobe((w) =>
					w ? { ...w, items: [...w.items, out.result.item] } : w,
				);
			setCard({ state: "shown", result: out.result });
			if (out.result.rarity === "relic") haptic([18, 40, 28]);
			else if (out.result.rarity === "rare") haptic(16);
		} catch (e) {
			setCard({ state: "idle" });
			setErr(
				e instanceof ApiError && e.status === 402
					? T.errors.notEnoughAsh
					: T.errors.failed,
			);
		}
	};

	const wear = async (id: string) => {
		const it = itemById(id);
		if (!it || wearing) return;
		setWearing(true);
		try {
			setWardrobe(await inv.equip({ [it.kind]: id }));
		} catch {
			setErr(T.errors.failed);
		} finally {
			setWearing(false);
		}
	};

	const short = state ? state.ash < state.cost : false;
	const busy = card.state === "scrying";

	return (
		<section className={s.screen}>
			<header className={s.head}>
				<h1 className={s.title}>{T.name}</h1>
				<div className={s.purse}>
					{state ? (
						<Count value={state.ash} size="sm" unit={T.ash} />
					) : (
						<span className={s.muted}>{T.loading}</span>
					)}
				</div>
			</header>

			{err ? (
				<p className="banner" role="alert">
					{err}
				</p>
			) : null}

			<div className={s.stage}>
				<FlipCard
					card={card}
					aspect={look.aspect}
					name={look.name}
					reduce={reduce}
					worn={wardrobe?.equipped}
					wearing={wearing}
					onWear={wear}
				/>
			</div>

			<div className={s.actions}>
				<motion.button
					type="button"
					className={s.cta}
					disabled={!state || busy || short}
					onClick={doScry}
					{...pressable}
				>
					{busy
						? T.scrying
						: card.state === "shown"
							? T.again(state?.cost ?? 100)
							: T.scry(state?.cost ?? 100)}
				</motion.button>
				{state ? (
					<p className={s.note}>
						{short ? T.errors.notEnoughAsh : T.pity(state.pityLeft)}
					</p>
				) : null}
				<p className={s.fine}>{T.rates}</p>
			</div>

			<Recent recent={state?.recent ?? null} aspect={look.aspect} />
		</section>
	);
}

/** The face-down card. Flips to the result once the Scrying returns. */
function FlipCard({
	card,
	aspect,
	name,
	reduce,
	worn,
	wearing,
	onWear,
}: {
	card: Card;
	aspect: number;
	name: string | null;
	reduce: boolean;
	worn: InventoryState["equipped"] | undefined;
	wearing: boolean;
	onWear: (id: string) => void;
}) {
	const shown = card.state === "shown" ? card.result : null;
	const flipped = shown != null;
	return (
		<div className={s.cardWrap}>
			<motion.div
				className={s.card}
				data-rarity={shown?.rarity}
				animate={
					card.state === "scrying" && !reduce
						? { rotateY: [0, -8, 8, -5, 0], scale: [1, 1.02, 1] }
						: { rotateY: flipped ? 180 : 0, scale: 1 }
				}
				transition={
					card.state === "scrying"
						? { duration: 0.65, repeat: Number.POSITIVE_INFINITY }
						: reduce
							? { duration: 0 }
							: { type: "spring", stiffness: 140, damping: 16 }
				}
			>
				<div className={s.back} aria-hidden="true">
					<span className={s.backSigil} />
				</div>
				<div className={s.front} aria-hidden={!flipped}>
					{shown ? (
						<Front
							result={shown}
							aspect={aspect}
							name={name}
							worn={worn}
							wearing={wearing}
							onWear={onWear}
						/>
					) : null}
				</div>
			</motion.div>
		</div>
	);
}

function Front({
	result,
	aspect,
	name,
	worn,
	wearing,
	onWear,
}: {
	result: ScryResult;
	aspect: number;
	name: string | null;
	worn: InventoryState["equipped"] | undefined;
	wearing: boolean;
	onWear: (id: string) => void;
}) {
	const it = itemById(result.item);
	if (!it) return null;
	const isWorn = worn?.[it.kind] === it.id;
	return (
		<div className={s.frontBody} aria-live="polite">
			<span className={s.rarity} data-rarity={result.rarity}>
				{T.rarity[result.rarity]}
			</span>
			<div className={s.frontArt}>
				{it.kind === "title" ? (
					<div className={s.titlePlate}>
						<DressedMask aspect={aspect} equipped={worn ?? {}} size={64} />
						{name ? <span className={s.plateName}>{name}</span> : null}
						<span className={s.plateTitle}>{itemName(it.id)}</span>
					</div>
				) : (
					<ItemSwatch id={it.id} aspect={aspect} size={112} />
				)}
			</div>
			<div className={s.frontText}>
				<span className={s.itemName}>{itemName(it.id)}</span>
				<Rubric size="xs" tone="bone">
					{T.kind[it.kind]}
				</Rubric>
			</div>
			<p className={s.frontStatus} data-dup={result.duplicate ? "1" : "0"}>
				{result.duplicate ? T.duplicate(result.refund) : T.fresh}
			</p>
			<button
				type="button"
				className={s.wear}
				disabled={isWorn || wearing}
				onClick={() => onWear(it.id)}
			>
				{isWorn ? T.worn : T.wear}
			</button>
		</div>
	);
}

function Recent({
	recent,
	aspect,
}: {
	recent: ScryResult[] | null;
	aspect: number;
}) {
	return (
		<section className={s.recent} aria-labelledby="reliquary-recent">
			<Rubric as="h2" rule="both" id="reliquary-recent">
				{T.recent}
			</Rubric>
			{recent && recent.length === 0 ? (
				<p className={s.muted}>{T.none}</p>
			) : null}
			<ul className={s.list}>
				<AnimatePresence initial={false}>
					{(recent ?? []).map((r) => (
						<motion.li
							key={r.n}
							className={s.row}
							layout
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<ItemSwatch id={r.item} aspect={aspect} size={36} />
							<span className={s.rowName}>{itemName(r.item)}</span>
							<span className={s.rowTag} data-rarity={r.rarity}>
								{T.rarity[r.rarity]}
							</span>
							<span className={s.rowRefund}>
								{r.duplicate ? `+${r.refund}` : ""}
							</span>
						</motion.li>
					))}
				</AnimatePresence>
			</ul>
		</section>
	);
}
