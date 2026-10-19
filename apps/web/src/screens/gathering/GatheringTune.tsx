"use client";

// The ?tune drawer for the Gathering: loaded on demand, only when the address asks for it.
import { TunePanel, type TunePanelProps } from "@/ui/tune/TunePanel.tsx";
import { GATHERING_TUNE } from "./tune.ts";

export default function GatheringTune(props: Omit<TunePanelProps, "spec">) {
	return <TunePanel spec={GATHERING_TUNE} {...props} />;
}
