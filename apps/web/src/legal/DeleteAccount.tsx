"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/client/api.ts";
import { legal } from "@/lexicon/legal.ts";
import { DangerButton, link, TextButton } from "@/ui/controls";
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
 * Two-step account deletion: "Delete my account", then "Yes, delete it" (DangerButtons; the second
 * sits beside the TextButton way back, which takes focus). On success it clears this
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
						<TextButton
							ref={keepRef}
							onClick={() => setPhase("idle")}
							disabled={phase === "working"}
						>
							{t.cancel}
						</TextButton>
						<DangerButton
							inline
							className={s.deleteGo}
							onClick={run}
							disabled={phase === "working"}
							loading={phase === "working"}
						>
							{phase === "working" ? t.working : t.confirm}
						</DangerButton>
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
						<Link href="/privacy#your-rights" className={link.inline}>
							{legal.links.privacy}
						</Link>
					</p>
					<div className={s.deleteActions}>
						<DangerButton inline onClick={() => setPhase("confirm")}>
							{t.start}
						</DangerButton>
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
