"use client";

/**
 * The way to open How to play from anywhere, without paying for it up front: the sheet's code
 * is fetched the first time it is asked for, then kept mounted so it can animate out.
 *
 *   const codex = useCodex();
 *   <TextButton onClick={() => codex.show()}>{T.open}</TextButton>
 *   {codex.sheet}
 *
 * From inside another sheet, close that one first and pass `afterSheet`: the Codex then opens
 * once the other sheet has stepped its Back entry off, so Android's Back closes one at a time.
 */
import {
	lazy,
	type ReactNode,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { CodexSection } from "@/lexicon/codex";

const Sheet = lazy(() => import("./Codex").then((m) => ({ default: m.Codex })));

/** Fetch the sheet ahead of a likely tap (e.g. once the title has settled). */
export const warmCodex = () => void import("./Codex").catch(() => {});

/** Long enough for a closing sheet's Back entry to be taken off first. */
const AFTER_SHEET_MS = 180;

export function CodexSheet({
	open,
	onClose,
	section,
}: {
	open: boolean;
	onClose: () => void;
	/** Open scrolled to this section. */
	section?: CodexSection | undefined;
}) {
	const [asked, setAsked] = useState(open);
	useEffect(() => {
		if (open) setAsked(true);
	}, [open]);
	if (!asked && !open) return null;
	return (
		<Suspense fallback={null}>
			<Sheet open={open} onClose={onClose} section={section} />
		</Suspense>
	);
}

export function useCodex(): {
	show: (section?: CodexSection, afterSheet?: boolean) => void;
	sheet: ReactNode;
} {
	const [st, setSt] = useState<{ open: boolean; section?: CodexSection }>({
		open: false,
	});
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	const show = useCallback((section?: CodexSection, afterSheet = false) => {
		clearTimeout(timer.current);
		const go = () => setSt(section ? { open: true, section } : { open: true });
		if (afterSheet) {
			warmCodex();
			timer.current = setTimeout(go, AFTER_SHEET_MS);
		} else go();
	}, []);
	const close = useCallback(() => setSt((s) => ({ ...s, open: false })), []);
	return {
		show,
		sheet: <CodexSheet open={st.open} section={st.section} onClose={close} />,
	};
}
