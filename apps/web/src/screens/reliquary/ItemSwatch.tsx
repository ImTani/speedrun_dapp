"use client";

/**
 * ItemSwatch: how a cosmetic looks on the player's own mask. Finishes and tints show the mask
 * wearing them; titles show a small name plate. Shared by the Reliquary and the Vestry.
 */
import { useEffect, useState } from "react";
import type { Api } from "@/client/api";
import { cosmeticOf, type Equipped, itemById } from "@/game/reliquary";
import { Mask } from "@/ui/Mask";
import s from "./reliquary.module.css";

/** The player's Fragment Aspect and name (Echo and no name until it answers). */
export function useFragmentLook(api: Api): {
	aspect: number;
	name: string | null;
} {
	const [look, setLook] = useState<{ aspect: number; name: string | null }>({
		aspect: 2,
		name: null,
	});
	useEffect(() => {
		let live = true;
		api
			.me()
			.then((me) => {
				const f = me.fragment;
				if (!live || !f) return;
				let aspect = 2;
				try {
					aspect = Number(BigInt(f.config) & 0xffn);
				} catch {}
				setLook({
					aspect: aspect >= 0 && aspect <= 6 ? aspect : 2,
					name: f.name,
				});
			})
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [api]);
	return look;
}

const SHADOW = "drop-shadow(0 3px 4px rgb(0 0 0 / .55))";

/** The mask in a given set of worn items. */
export function DressedMask({
	aspect,
	equipped,
	size,
	glow = false,
}: {
	aspect: number;
	equipped: Partial<Equipped>;
	size: number;
	glow?: boolean;
}) {
	const c = cosmeticOf(equipped);
	return (
		<Mask
			aspect={aspect}
			size={size}
			variant={c.variant}
			glow={glow}
			style={c.filter ? { filter: `${c.filter} ${SHADOW}` } : {}}
		/>
	);
}

/** One item, previewed on the player's mask (or as a plate, for titles). */
export function ItemSwatch({
	id,
	aspect,
	size,
}: {
	id: string;
	aspect: number;
	size: number;
}) {
	const it = itemById(id);
	if (!it) return null;
	if (it.kind === "title")
		return (
			<span
				className={s.titleSwatch}
				style={{ width: size, height: size }}
				aria-hidden="true"
			>
				<span />
				<span />
			</span>
		);
	return (
		<span aria-hidden="true" style={{ lineHeight: 0 }}>
			<DressedMask
				aspect={aspect}
				size={size}
				equipped={it.kind === "finish" ? { finish: it.id } : { tint: it.id }}
			/>
		</span>
	);
}
