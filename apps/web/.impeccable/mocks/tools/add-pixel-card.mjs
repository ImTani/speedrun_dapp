import { readFileSync, writeFileSync } from "node:fs";

const p = JSON.parse(readFileSync(".impeccable/decision/round1.json", "utf8"));
p.options.splice(2, 0, {
	id: "pixel-arcana",
	label: "Pixel Arcana",
	kicker: "YOUR STEER",
	lineage: "pixel-art RPGs (Heroll-adjacent), rendering the Reading Table",
	thesis: "The Reading Table drawn in hand-authored pixel art: same upright/reversed duels, sprites and frames written in code.",
	palette: ["#3b2a3f", "#1b1420", "#efe6d2", "#b8323c", "#e9b23a", "#3c5aa6"],
	materials: ["code-authored sprites", "dithered cloth", "stepped pixel frames"],
	viewport: "Hero sprite and rank at the head, the night's cards laid face-up and face-down, the candle haul, the night's ledger best to worst, one action to lay tonight's spread.",
	risk: "This sketch is Claude's code-only pixel ceiling (simple 16-32px sprites); Heroll-level detail needs human-made art: a licensed/CC0 pack or a commissioned artist.",
	html: ".impeccable/mocks/decision/pixel-arcana.html",
	htmlFrame: "390x844",
});
p.question =
	"The roll dealt the Reading Table; your pixel-art steer is the new card. Keep one, take an alternate, or re-roll.";
writeFileSync(".impeccable/decision/round1b.json", JSON.stringify(p, null, 2));
console.log("round1b.json written");
