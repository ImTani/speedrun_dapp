// First-run guide: four steps, one short sentence each.

export const tutorial = {
	/** Accessible name of the guide. */
	label: "How to play",
	steps: [
		{
			title: "Bind a Fragment",
			line: "Pick a mask and set its Sigils. It fights for you.",
		},
		{
			title: "Gatherings run on their own",
			line: "Your Fragment duels in every Gathering, even while you're away.",
		},
		{
			title: "Collect the Vigil",
			line: "Ash and Resonance build up for 12 hours. Come back and collect.",
		},
		{
			title: "Climb the Spire",
			line: "Clear its floors to rise a Degree and raise your level cap.",
		},
	],
	skip: "Skip",
	next: "Next",
	done: "Begin",
	/** "Step 2 of 4" for screen readers. */
	stepOf: (n: number, of: number) => `Step ${n} of ${of}`,
} as const;
