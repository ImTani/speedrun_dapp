"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/client/api.ts";
import { legal } from "@/lexicon/legal.ts";
import {
	clearLocalGameData,
	deleteAccount,
	unsubscribePush,
} from "./deleteAccount.ts";
import s from "./legal.module.css";

type Phase = "idle" | "confirm" | "working" | "done" | "error";

export interface DeleteAccountProps {
	/** Runs after the data is deleted and the player is signed out (e.g. route to the title). */
	onDeleted?: () => void;
	className?: string;
}

/**
 * Two-step account deletion: "Delete my account", then "Yes, delete it". On success it clears this
 * device's game storage, unsubscribes push, signs out of Privy, then calls onDeleted.
 */
export function DeleteAccount({ onDeleted, className }: DeleteAccountProps) {
	const api = useApi();
	const { logout } = usePrivy();
	const [phase, setPhase] = useState<Phase>("idle");
	const keepRef = useRef<HTMLButtonElement>(null);
	const t = legal.deletion;

	// Moving to the confirm step puts focus on the safe choice.
	useEffect(() => {
		if (phase === "confirm") keepRef.current?.focus();
	}, [phase]);

	const run = async () => {
		setPhase("working");
		try {
			await deleteAccount(api);
		} catch {
			setPhase("error");
			return;
		}
		clearLocalGameData();
		await unsubscribePush();
		setPhase("done");
		try {
			await logout();
		} catch {}
		onDeleted?.();
	};

	return (
		<section
			className={`${s.delete} ${className ?? ""}`}
			aria-labelledby="delete-account-h"
		>
			<h2 id="delete-account-h" className={s.deleteTitle}>
				{phase === "confirm" || phase === "working" ? t.confirmTitle : t.title}
			</h2>

			{phase === "confirm" || phase === "working" ? (
				<>
					<p>{t.confirmLead}</p>
					<div className={s.deleteActions}>
						<button
							ref={keepRef}
							type="button"
							className={s.btn}
							onClick={() => setPhase("idle")}
							disabled={phase === "working"}
						>
							{t.cancel}
						</button>
						<button
							type="button"
							className={`${s.btn} ${s.btnDanger}`}
							onClick={run}
							disabled={phase === "working"}
						>
							{phase === "working" ? t.working : t.confirm}
						</button>
					</div>
				</>
			) : phase === "done" ? (
				<p className={s.deleteStatus} role="status">
					{t.done}
				</p>
			) : (
				<>
					<p>{t.lead}</p>
					<p className={s.deleteSmall}>
						{t.kept}{" "}
						<Link href="/privacy#your-rights">{legal.links.privacy}</Link>
					</p>
					<div className={s.deleteActions}>
						<button
							type="button"
							className={`${s.btn} ${s.btnDanger}`}
							onClick={() => setPhase("confirm")}
						>
							{t.start}
						</button>
					</div>
					{phase === "error" ? (
						<p className={`${s.deleteStatus} ${s.deleteError}`} role="alert">
							{t.failed}
						</p>
					) : null}
				</>
			)}
		</section>
	);
}
