"use client";

/**
 * Wardrobe: choose the finish, tint and title the player's Fragment wears.
 * A tap wears the item at once; the preview follows.
 */
import { type ReactNode, useState } from "react";
import { buzz, HAPTIC, play } from "@/audio";
import type { Api } from "@/client/api";
import { type InventoryState, inventory } from "@/client/inventory";
import {
	cosmeticOf,
	type Equipped,
	type ItemKind,
	itemById,
} from "@/game/reliquary";
import { itemName, titleText } from "@/lexicon/reliquary";
import { vestry as T } from "@/lexicon/vestry";
import { Rubric } from "@/ui/type";
import { DressedMask, ItemSwatch } from "../reliquary/ItemSwatch";
import s from "./vestry.module.css";

const SLOTS: readonly ItemKind[] = ["finish", "tint", "title"];

export function Wardrobe({
	api,
	aspect,
	name,
	state,
	onChange,
}: {
	api: Api;
	aspect: number;
	name: string | null;
	state: InventoryState;
	onChange: (next: InventoryState) => void;
}) {
	const [err, setErr] = useState<string | null>(null);
	const [saving, setSaving] = useState<ItemKind | null>(null);
	const eq = state.equipped;
	const title = titleText(cosmeticOf(eq).title);

	const choose = async (slot: ItemKind, id: string | null) => {
		if (eq[slot] === id || saving) return;
		// Worn at once (the preview follows), so it sounds at once: a soft seal.
		play("seal", { volume: 0.5 });
		buzz(HAPTIC.seal);
		const before = state;
		onChange({ ...state, equipped: { ...eq, [slot]: id } as Equipped });
		setSaving(slot);
		setErr(null);
		try {
			onChange(await inventory(api).equip({ [slot]: id }));
		} catch {
			onChange(before);
			setErr(T.errors.saveFailed);
			play("error");
		} finally {
			setSaving(null);
		}
	};

	return (
		<section className={s.wardrobe} aria-labelledby="vestry-wardrobe">
			<Rubric as="h2" rule="both" id="vestry-wardrobe">
				{T.wardrobe.heading}
			</Rubric>
			<div className={s.preview}>
				<DressedMask aspect={aspect} equipped={eq} size={88} glow />
				<div className={s.previewText}>
					{name ? <span className={s.previewName}>{name}</span> : null}
					<span className={s.previewTitle}>{title || T.wardrobe.noTitle}</span>
				</div>
			</div>
			{err ? (
				<p className="banner" role="alert">
					{err}
				</p>
			) : null}
			{SLOTS.map((slot) => {
				const owned = state.items.filter((i) => itemById(i)?.kind === slot);
				const none =
					slot === "finish"
						? T.wardrobe.gilded
						: slot === "title"
							? T.wardrobe.noTitle
							: T.wardrobe.none;
				return (
					<fieldset key={slot} className={s.slot} disabled={saving !== null}>
						<legend className={s.slotName}>{T.wardrobe[slot]}</legend>
						<div className={s.chips}>
							<Chip
								on={eq[slot] === null}
								onPick={() => choose(slot, null)}
								label={none}
							>
								{slot === "title" ? null : (
									<DressedMask aspect={aspect} equipped={{}} size={28} />
								)}
							</Chip>
							{owned.map((id) => (
								<Chip
									key={id}
									on={eq[slot] === id}
									onPick={() => choose(slot, id)}
									label={itemName(id)}
								>
									{slot === "title" ? null : (
										<ItemSwatch id={id} aspect={aspect} size={28} />
									)}
								</Chip>
							))}
						</div>
					</fieldset>
				);
			})}
		</section>
	);
}

function Chip({
	on,
	onPick,
	label,
	children,
}: {
	on: boolean;
	onPick: () => void;
	label: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			className={s.chip}
			data-on={on ? "1" : "0"}
			data-sfx="off"
			aria-pressed={on}
			onClick={onPick}
		>
			{children}
			<span>{label}</span>
		</button>
	);
}
