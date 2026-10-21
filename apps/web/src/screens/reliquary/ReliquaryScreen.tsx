"use client";

/**
 * The Reliquary: spend Ash to scry one cosmetic. A face-down card flips to show what came;
 * duplicates give Ash back. Recent Scryings sit below.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
	type Ref,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { type Cue, HAPTIC, play, useSfx, type Voice } from "@/audio";
import { ApiError, useApi } from "@/client/api";
import {
	type InventoryState,
	inventory,
	type ReliquaryState,
} from "@/client/inventory";
import { FX, fx } from "@/fx";
import { itemById, type Rarity, type ScryResult } from "@/game/reliquary";
import { itemName, reliquary as T } from "@/lexicon/reliquary";
import { PrimaryButton } from "@/ui/button";
import { ControlNote, SecondaryButton } from "@/ui/controls";
import { TabIntro } from "@/ui/intro";
import { hitStop, IMPACT, impact, useShake } from "@/ui/motion";
import { Count, Rubric } from "@/ui/type";
import { DressedMask, ItemSwatch, useFragmentLook } from "./ItemSwatch";
import s from "./reliquary.module.css";

const STINGER: Record<Rarity, Cue> = {
	common: "rarityCommon",
	rare: "rarityRare",
	relic: "rarityRelic",
};

/** Embers drawn in from around the card while the Scrying builds. */
function gatherEmbers(card: Element, wave: number): void {
	const r = card.getBoundingClientRect();
	const cx = r.left + r.width / 2;
	const cy = r.top + r.height / 2;
	const reach = Math.max(r.width, r.height) * 0.8;
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2 + wave * 0.5;
		void fx.stream(
			{ x: cx + Math.cos(a) * reach, y: cy + Math.sin(a) * reach },
			card,
			{
				count: 3,
				color: i % 2 ? FX.ember : FX.emberHi,
				duration: 0.6,
				spread: 18,
				size: 2.4,
				pop: false,
			},
		);
	}
}

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
	const sfx = useSfx([
		"scryBuild",
		"rarityCommon",
		"rarityRare",
		"rarityRelic",
	]);
	const shaker = useShake<HTMLDivElement>();
	const cardRef = useRef<HTMLDivElement>(null);
	const purseRef = useRef<HTMLDivElement>(null);
	const build = useRef<Voice | null>(null);

	// Leaving mid-Scry: let the swell go with the screen.
	useEffect(() => () => build.current?.stop(120), []);

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
		// The price leaves the purse at once; a duplicate's refund flies back after the reveal.
		const before = state.ash;
		setState((st) => (st ? { ...st, ash: Math.max(0, st.ash - st.cost) } : st));
		build.current?.stop(60);
		build.current = sfx.play("scryBuild");
		const el = cardRef.current;
		const waves: ReturnType<typeof setTimeout>[] = [];
		if (el) {
			gatherEmbers(el, 0);
			waves.push(setTimeout(() => gatherEmbers(el, 1), 380));
		}
		try {
			const [out] = await Promise.all([
				inv.scry(),
				new Promise((r) => setTimeout(r, reduce ? 0 : 650)),
			]);
			const { rarity, duplicate, refund } = out.result;
			const back = duplicate && refund > 0 ? refund : 0;
			setState((st) =>
				st
					? {
							...st,
							ash: out.ash - back,
							pityLeft: out.pityLeft,
							recent: [out.result, ...st.recent].slice(0, 10),
						}
					: st,
			);
			if (!out.result.duplicate)
				setWardrobe((w) =>
					w ? { ...w, items: [...w.items, out.result.item] } : w,
				);
			// A relic holds its breath before the turn: a blow, a frozen beat, then the flip.
			if (rarity === "relic") {
				void impact(shaker, {
					...IMPACT.devour,
					stop: 0,
					buzz: HAPTIC.relic.slice(),
				});
				await hitStop(reduce ? 0 : 280);
			} else if (rarity === "rare") {
				sfx.buzz(HAPTIC.reveal);
			}
			build.current?.stop(rarity === "common" ? 140 : 60);
			build.current = null;
			setCard({ state: "shown", result: out.result });
			// The face comes round about a third of the way into the flip.
			const turn = reduce ? 0 : 0.26;
			sfx.play(STINGER[rarity], { delay: turn * 1000 });
			if (el) {
				fx.burst("sparkle", el, { rarity, spread: 40, delay: turn });
				if (rarity === "relic") {
					fx.ring(el, FX.gilt, { radius: 220, width: 10, delay: turn });
					fx.ring(el, FX.giltHi, {
						radius: 140,
						width: 5,
						duration: 0.5,
						delay: turn + 0.1,
					});
				}
			}
			if (back > 0) {
				// The duplicate melts back into Ash, which flies to the purse.
				setTimeout(() => {
					const to = purseRef.current;
					if (!el || !to) {
						setState((st) => (st ? { ...st, ash: out.ash } : st));
						return;
					}
					let landed = false;
					void fx.flyTo(el, to, {
						icon: "ash",
						count: Math.max(4, Math.min(10, Math.round(back / 10))),
						onArrive: () => {
							if (landed) return;
							landed = true;
							setState((st) => (st ? { ...st, ash: out.ash } : st));
						},
					});
				}, 900);
			}
		} catch (e) {
			build.current?.stop(80);
			build.current = null;
			play("error");
			setState((st) => (st ? { ...st, ash: before } : st));
			setCard({ state: "idle" });
			setErr(
				e instanceof ApiError && e.status === 402
					? T.errors.notEnoughAsh
					: T.errors.failed,
			);
		} finally {
			for (const w of waves) clearTimeout(w);
		}
	};

	const wear = async (id: string) => {
		const it = itemById(id);
		if (!it || wearing) return;
		setWearing(true);
		try {
			setWardrobe(await inv.equip({ [it.kind]: id }));
			sfx.play("seal", { volume: 0.55 });
			sfx.buzz(HAPTIC.seal);
		} catch {
			setErr(T.errors.failed);
		} finally {
			setWearing(false);
		}
	};

	const short = state ? state.ash < state.cost : false;
	const busy = card.state === "scrying";
	const noteId = useId();
	// The purse can't cover it: the button disables and the note says what you hold.
	const blocked = short && !busy;

	return (
		<section className={s.screen}>
			<TabIntro tab="reliquary" ready={!!state} />
			<header className={s.head}>
				<h1 className={s.title}>{T.name}</h1>
				<div className={s.purse} ref={purseRef}>
					{state ? (
						<Count value={state.ash} size="sm" unit={T.ash} tick="ash" />
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

			<div className={s.stage} ref={shaker.ref}>
				<FlipCard
					ref={cardRef}
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
				<PrimaryButton
					hero
					burst
					legacy={s.cta}
					className={s.ctaFit}
					data-sfx="off"
					disabled={!state || busy || short}
					loading={busy}
					aria-describedby={state ? noteId : undefined}
					onClick={doScry}
				>
					{busy
						? T.scrying
						: card.state === "shown"
							? T.again(state?.cost ?? 100)
							: T.scry(state?.cost ?? 100)}
				</PrimaryButton>
				{state ? (
					<ControlNote id={noteId} tone={blocked ? "warn" : "muted"}>
						{blocked ? T.have(state.ash) : T.pity(state.pityLeft)}
					</ControlNote>
				) : null}
				<p className={s.fine}>{T.rates}</p>
			</div>

			<Recent recent={state?.recent ?? null} aspect={look.aspect} />
		</section>
	);
}

/** The face-down card. Flips to the result once the Scrying returns. */
function FlipCard({
	ref,
	card,
	aspect,
	name,
	reduce,
	worn,
	wearing,
	onWear,
}: {
	ref: Ref<HTMLDivElement>;
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
		<div className={s.cardWrap} ref={ref}>
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
			{isWorn ? (
				<p className={s.worn}>{T.worn}</p>
			) : (
				<SecondaryButton
					inline
					className={s.wear}
					loading={wearing}
					onClick={() => onWear(it.id)}
				>
					{T.wear}
				</SecondaryButton>
			)}
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
