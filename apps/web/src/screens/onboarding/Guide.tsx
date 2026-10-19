"use client";

/**
 * Everything that teaches, mounted once over the shell and loaded on its own (the shell
 * imports it lazily): the onboarding script while it runs, then the first-visit coach for
 * whatever opens next. Each renders nothing when it has nothing to say.
 */
import type { Tab } from "@/ui/TabBar";
import { Onboarding } from "./Onboarding";
import { UnlockCoach } from "./UnlockCoach";

export function Guide({ tab }: { tab: Tab }) {
	return (
		<>
			<Onboarding tab={tab} />
			<UnlockCoach tab={tab} />
		</>
	);
}
