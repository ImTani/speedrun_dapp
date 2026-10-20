"use client";

/**
 * The control family on one sheet (dev only, /_brand/controls), for review now that the
 * primary call to action is settled (wax). Everything here is the game's own component or
 * its own CSS class; where a control lives inline in a screen, the sheet repeats its markup
 * with the real class (and copies the small glyph). Nothing is restyled.
 *
 * Grouped by type, each in the states it has: rest, pressed, disabled, selected / on, focus.
 * Pressed and focus can only be held by props on PrimaryButton; elsewhere they are
 * approximated (state label marked "≈"). Wrapped in the preview harness's mock providers,
 * so it renders without signing in. The written inventory: src/ui/CONTROLS.md.
 */
import type { Knobs } from "@arena/strategies";
import { DEFAULT_KNOBS } from "@arena/strategies";
import { type ReactNode, useEffect, useState } from "react";
import { SoundSettingsList, SoundToggle } from "@/audio";
import au from "@/audio/audio.module.css";
import { SPEAKER_ICON } from "@/audio/credits";
import { useApi } from "@/client/api";
import { fetchMarks, type MarksResponse } from "@/client/marks";
import { MockApiProvider } from "@/client/mock";
import {
	resetMockEconomy,
	resetMockInventory,
	resetMockMarks,
	resetMockSpire,
	resetMockState,
} from "@/client/mock/index";
import { mockStandings, SELF_AGENT } from "@/client/mockData";
import { fetchSpire, type SpireState } from "@/client/spire";
import ld from "@/landing/landing.module.css";
import { DeleteAccount, LegalLinks } from "@/legal";
import { BackLink } from "@/legal/BackLink";
import lg from "@/legal/legal.module.css";
import { L } from "@/lexicon";
import { legal } from "@/lexicon/legal";
import { marks as M } from "@/lexicon/marks";
import { itemName } from "@/lexicon/reliquary";
import { shell } from "@/lexicon/shell";
import fr from "@/screens/fragment/fragment.module.css";
import { MarksShelf } from "@/screens/fragment/Hud";
import hd from "@/screens/fragment/hud.module.css";
import { SigilEditor } from "@/screens/fragment/SigilEditor";
import { WaxSeal } from "@/screens/fragment/WaxSeal";
import ga from "@/screens/gathering/gathering.module.css";
import { LedgerButton } from "@/screens/gathering/Ledger";
import pr from "@/screens/onboarding/practice.module.css";
import { DressedMask, ItemSwatch } from "@/screens/reliquary/ItemSwatch";
import rq from "@/screens/reliquary/reliquary.module.css";
import sp from "@/screens/spire/spire.module.css";
import { Tower } from "@/screens/spire/Tower";
import { SettingsEntry } from "@/screens/title/SettingsEntry";
import ti from "@/screens/title/title.module.css";
import vs from "@/screens/vestry/vestry.module.css";
import { BUTTON_STYLE, PrimaryButton, PrimaryLink } from "@/ui/button";
import co from "@/ui/coach/coach.module.css";
import { Mask } from "@/ui/Mask";
import { type Tab, TabBar } from "@/ui/TabBar";
import c from "./controls.module.css";

const noop = () => {};

/** Seeds the shared mock world once, before the provider's children mount. */
function seed() {
	resetMockState("late", { aspect: 2 });
	resetMockEconomy();
	resetMockInventory();
	resetMockMarks();
	resetMockSpire("mid", { aspect: 2, outcome: null });
}

export function ControlsClient() {
	useState(seed);
	return (
		<MockApiProvider state={{ me: "confirmed", aspect: 2 }}>
			<Sheet />
		</MockApiProvider>
	);
}

// ---------------------------------------------------------------- frame

function Section({
	id,
	title,
	sub,
	children,
}: {
	id: string;
	title: string;
	sub?: string;
	children: ReactNode;
}) {
	return (
		<section className={c.section} data-section={id}>
			<h2 className={c.h2}>{title}</h2>
			{sub ? <p className={c.sub}>{sub}</p> : null}
			<div className={c.grid}>{children}</div>
		</section>
	);
}

function Item({
	name,
	where,
	uses,
	note,
	wide,
	flush,
	children,
}: {
	name: string;
	where: string;
	uses: string;
	note?: string;
	wide?: boolean;
	flush?: boolean;
	children: ReactNode;
}) {
	return (
		<article className={c.item} data-wide={wide || undefined}>
			<header className={c.cap}>
				<h3 className={c.name}>{name}</h3>
				<p className={c.where}>
					{where}
					<span className={c.uses}>{uses}</span>
				</p>
			</header>
			<div className={c.cells} data-flush={flush || undefined}>
				{children}
			</div>
			{note ? <p className={c.note}>{note}</p> : null}
		</article>
	);
}

type Force = "press" | "soft" | "focus" | "focusIn";

function Cell({
	s,
	size,
	force,
	children,
}: {
	s: string;
	size?: "full" | "half";
	force?: Force;
	children: ReactNode;
}) {
	return (
		<div className={c.cell} data-size={size}>
			<span className={c.state}>{s}</span>
			<div className={c.body} data-force={force}>
				{children}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------- glyphs copied from their screens

/** AspectCarousel.tsx Chevron. */
function Chevron({ flip = false }: { flip?: boolean }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width="26"
			height="26"
			aria-hidden="true"
			style={flip ? { transform: "scaleX(-1)" } : undefined}
		>
			<path
				d="M8 3 L18 12 L8 21"
				fill="none"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** BindRitual.tsx back chevron. */
function BackGlyph() {
	return (
		<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
			<path
				d="M16 3 L6 12 L16 21"
				fill="none"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** BindRitual.tsx star on "Suggest a name". */
function Star() {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
			<path
				d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9Z"
				fill="currentColor"
				stroke="#0b0807"
				strokeWidth="1.4"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Ledger.tsx close X. */
function Cross() {
	return (
		<svg viewBox="0 0 18 18" aria-hidden="true">
			<path
				d="M3 3l12 12M15 3 3 15"
				stroke="currentColor"
				strokeWidth="2.2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** GatheringScreen.tsx Hourglass. */
function Hourglass() {
	return (
		<svg viewBox="-16 -24 32 48" aria-hidden="true">
			<polygon
				points="-13,-21 13,-21 12,-16 -12,-16"
				fill="#4a3626"
				stroke="#0b0807"
				strokeWidth="1.6"
			/>
			<polygon
				points="-13,16 13,16 14,21 -14,21"
				fill="#4a3626"
				stroke="#0b0807"
				strokeWidth="1.6"
			/>
			<path d="M-11 -16 V16 M11 -16 V16" stroke="#0b0807" strokeWidth="2.6" />
			<path d="M-11 -16 V16" stroke="#6b5139" strokeWidth="1" />
			<path
				d="M-8 -16 Q-8 -4 0 0 Q-8 4 -8 16 H8 Q8 4 0 0 Q8 -4 8 -16Z"
				fill="#d8c6a0"
				opacity=".14"
			/>
			<path d="M-6.5 16 Q0 7 6.5 16Z" fill="#c9a24f" />
			<path d="M-4.5 -8 Q0 -3 4.5 -8Z" fill="#c9a24f" opacity=".8" />
			<path d="M0 -2 V12" stroke="#e3c27c" strokeWidth=".9" />
			<path
				d="M-8 -16 Q-8 -4 0 0 Q-8 4 -8 16 H8 Q8 4 0 0 Q8 -4 8 -16Z"
				fill="none"
				stroke="#0b0807"
				strokeWidth="1.6"
			/>
		</svg>
	);
}

/** Hud.tsx Bell (the notifications row). */
function Bell({ on }: { on: boolean }) {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
			<path
				d="M12 3a5 5 0 0 0-5 5v3.2c0 1.3-.5 2.6-1.4 3.6L4.5 16h15l-1.1-1.2a5.3 5.3 0 0 1-1.4-3.6V8a5 5 0 0 0-5-5Zm-2 15a2 2 0 0 0 4 0"
				fill={on ? "#e3c27c" : "none"}
				stroke={on ? "#0b0807" : "#a8916a"}
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function Speaker({ on }: { on: boolean }) {
	return (
		<button
			type="button"
			className={au.toggle}
			data-on={on}
			aria-label={on ? "Mute sound" : "Turn sound on"}
		>
			<svg
				className={au.icon}
				viewBox={SPEAKER_ICON.viewBox}
				aria-hidden="true"
			>
				<path d={on ? SPEAKER_ICON.on.d : SPEAKER_ICON.off.d} />
			</svg>
		</button>
	);
}

// ---------------------------------------------------------------- the sheet

function Sheet() {
	const api = useApi();
	const [spire, setSpire] = useState<SpireState | null>(null);
	const [marks, setMarks] = useState<MarksResponse | null>(null);
	useEffect(() => {
		let live = true;
		fetchSpire(api)
			.then((s) => live && setSpire(s))
			.catch(noop);
		fetchMarks(api)
			.then((m) => live && setMarks(m))
			.catch(noop);
		return () => {
			live = false;
		};
	}, [api]);

	return (
		<main className={c.page} data-ready={spire && marks ? "1" : undefined}>
			<header className={c.head}>
				<h1 className={c.h1}>Controls</h1>
				<p className={c.lede}>
					Every kind of button and control in the game, drawn by its own
					component or class, grouped by type. Each card is one phone column
					(390). The primary call to action is set by <code>BUTTON_STYLE</code>{" "}
					(now <b>{BUTTON_STYLE}</b>) and sits on top for reference. States
					marked ≈ are approximations (a press or keyboard focus cannot be held
					from outside). Inventory with file and line:{" "}
					<code>src/ui/CONTROLS.md</code>.
				</p>
			</header>

			<Primary />
			<Secondary />
			<Ghost />
			<Destructive />
			<Icons />
			<Tabs />
			<Pickers />
			<Switches />
			<TextInput />
			<Links />
			<Sheets />
			<Cards spire={spire} marks={marks} />
			<Landing />
		</main>
	);
}

// ---------------------------------------------------------------- 1. primary

function Primary() {
	return (
		<Section
			id="primary"
			title="Reference · primary call to action (wax)"
			sub="PrimaryButton / PrimaryLink (src/ui/button). The one look every main action wears."
		>
			<Item
				name="PrimaryButton · lg"
				where="Enter · Choose this mask / Next · Bind · Unveil / Continue · Climb · Continue · Scry / Again"
				uses="9 call sites"
			>
				<Cell s="Rest" size="full">
					<PrimaryButton>Bind</PrimaryButton>
				</Cell>
				<Cell s="Pressed" size="full">
					<PrimaryButton pressed>Bind</PrimaryButton>
				</Cell>
				<Cell s="Disabled" size="full">
					<PrimaryButton disabled>Bind</PrimaryButton>
				</Cell>
				<Cell s="Loading 50%" size="full">
					<PrimaryButton disabled loading progress={0.5}>
						Binding…
					</PrimaryButton>
				</Cell>
				<Cell s="Focus" size="full">
					<PrimaryButton focused>Bind</PrimaryButton>
				</Cell>
			</Item>
			<Item
				name="PrimaryButton · md"
				where="Collect (Vigil card) · Save (Retune sheet) · Buy (Vestry pack)"
				uses="3 call sites"
				note="Below: the Retune sheet's foot as shipped, the btn-ghost Cancel beside the wax Save."
			>
				<Cell s="Rest" size="half">
					<PrimaryButton size="md">Collect</PrimaryButton>
				</Cell>
				<Cell s="Pressed" size="half">
					<PrimaryButton size="md" pressed>
						Collect
					</PrimaryButton>
				</Cell>
				<Cell s="Disabled" size="half">
					<PrimaryButton size="md" disabled>
						Collect
					</PrimaryButton>
				</Cell>
				<Cell s="Loading" size="half">
					<PrimaryButton size="md" disabled loading progress={0.5}>
						Buying…
					</PrimaryButton>
				</Cell>
				<Cell s="Focus" size="half">
					<PrimaryButton size="md" focused>
						Buy · 1 USDC
					</PrimaryButton>
				</Cell>
				<Cell s="Long label" size="half">
					<PrimaryButton size="md" disabled>
						5 USDC · not enough
					</PrimaryButton>
				</Cell>
				<Cell s="In the Retune sheet foot" size="full">
					<div className={fr.sheetFoot} style={{ width: "100%" }}>
						<button type="button" className="btn btn-ghost">
							Cancel
						</button>
						<PrimaryButton size="md">Save</PrimaryButton>
					</div>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 2. secondary

function Secondary() {
	return (
		<Section
			id="secondary"
			title="Secondary buttons"
			sub="Seven different styles today: three chamfered slabs, two square framed buttons, two hairline buttons."
		>
			<Item
				name=".btn.btn-ghost (globals.css)"
				where="Retune (Fragment tab, + .chisel) · Cancel (Retune sheet) · Try again (Spire error)"
				uses="3 uses"
				note="Chamfered slab, blackletter. The only shared secondary class."
			>
				<Cell s="Rest" size="half">
					<button type="button" className={`btn btn-ghost ${fr.chisel}`}>
						Retune
					</button>
				</Cell>
				<Cell s="Pressed ≈" size="half" force="press">
					<button type="button" className={`btn btn-ghost ${fr.chisel}`}>
						Retune
					</button>
				</Cell>
				<Cell s="Disabled" size="half">
					<button
						type="button"
						className={`btn btn-ghost ${fr.chisel}`}
						disabled
					>
						Cancel
					</button>
				</Cell>
				<Cell s="Focus ≈" size="half" force="focusIn">
					<button type="button" className={`btn btn-ghost ${fr.chisel}`}>
						Try again
					</button>
				</Cell>
			</Item>

			<Item
				name="fragment .divine"
				where="Suggest a name (ritual step III)"
				uses="1 use"
				note="Square, gilt ring and glow, blackletter, star glyph."
			>
				<Cell s="Rest">
					<button type="button" className={fr.divine}>
						<Star />
						Suggest a name
					</button>
				</Cell>
				<Cell s="Pressed ≈" force="press">
					<button type="button" className={fr.divine}>
						<Star />
						Suggest a name
					</button>
				</Cell>
				<Cell s="Disabled">
					<button type="button" className={fr.divine} disabled>
						<Star />
						Suggest a name
					</button>
				</Cell>
				<Cell s="Focus ≈" force="focus">
					<button type="button" className={fr.divine}>
						<Star />
						Suggest a name
					</button>
				</Cell>
			</Item>

			<Item
				name="reliquary .wear"
				where="Wear it / Worn (Reliquary card back)"
				uses="1 use"
				note="Square, gilt-d ring, Grenze roman. Plain button: no press motion."
			>
				<Cell s="Rest">
					<button type="button" className={rq.wear}>
						Wear it
					</button>
				</Cell>
				<Cell s="Disabled (worn)">
					<button type="button" className={rq.wear} disabled>
						Worn
					</button>
				</Cell>
				<Cell s="Focus ≈" force="focus">
					<button type="button" className={rq.wear}>
						Wear it
					</button>
				</Cell>
			</Item>

			<Item
				name="title .leafClose"
				where="Close (Credits / Settings sheet)"
				uses="1 use"
				note="Chamfered umber slab, blackletter."
			>
				<Cell s="Rest" size="full">
					<button type="button" className={ti.leafClose}>
						Close
					</button>
				</Cell>
				<Cell s="Pressed ≈" size="half" force="press">
					<button type="button" className={ti.leafClose}>
						Close
					</button>
				</Cell>
				<Cell s="Focus ≈" size="half" force="focusIn">
					<button type="button" className={ti.leafClose}>
						Close
					</button>
				</Cell>
			</Item>

			<Item
				name="legal .btn · .noticeDismiss"
				where="Keep my account (delete step 2) · Got it (storage notice)"
				uses="2 uses"
				note="Hairline web buttons in Alegreya: no slab, no press motion, hover only."
			>
				<Cell s="Rest">
					<button type="button" className={lg.btn}>
						Keep my account
					</button>
				</Cell>
				<Cell s="Disabled">
					<button type="button" className={lg.btn} disabled>
						Keep my account
					</button>
				</Cell>
				<Cell s="Focus ≈" force="focus">
					<button type="button" className={lg.btn}>
						Keep my account
					</button>
				</Cell>
				<Cell s="Storage notice (docked above the ledge)" size="full">
					<aside
						className={lg.notice}
						style={{ position: "static", margin: 0, width: "100%" }}
					>
						<p className={lg.noticeText}>
							{legal.notice.text} <a href="/cookies">{legal.notice.link}</a>
						</p>
						<button type="button" className={lg.noticeDismiss}>
							{legal.notice.dismiss}
						</button>
					</aside>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 3. ghost / text

function Ghost() {
	return (
		<Section
			id="ghost"
			title="Ghost and text buttons"
			sub="Three different Skips, and a button drawn as a link."
		>
			<Item
				name="Skip × 3"
				where="practice .skip (practice duel) · coach .skip (coach mark) · spire .skip (Spire duel)"
				uses="3 uses"
				note="Same word, three treatments: bare small caps, a dark pill, bare micro caps."
			>
				<Cell s="Practice duel">
					<button type="button" className={pr.skip}>
						Skip
					</button>
				</Cell>
				<Cell s="Coach mark">
					<div className={c.dim}>
						<button type="button" className={co.skip}>
							Skip
						</button>
					</div>
				</Cell>
				<Cell s="Spire duel">
					<button type="button" className={sp.skip}>
						Skip
					</button>
				</Cell>
				<Cell s="Coach · focus ≈" force="focus">
					<button type="button" className={co.skip}>
						Skip
					</button>
				</Cell>
			</Item>
			<Item
				name="title .colophonLink"
				where="Credits (title screen foot, beside the legal links)"
				uses="1 use"
				note="A button styled as a link: underline only on hover / focus."
			>
				<Cell s="Rest">
					<button type="button" className={ti.colophonLink}>
						Credits
					</button>
				</Cell>
				<Cell s="Focus ≈" force="focus">
					<button
						type="button"
						className={ti.colophonLink}
						style={{ textDecoration: "underline", textUnderlineOffset: 3 }}
					>
						Credits
					</button>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 4. destructive

function Destructive() {
	const t = legal.deletion;
	return (
		<Section
			id="destructive"
			title="Destructive"
			sub="Delete my account, two steps, inside the in-game Settings sheet."
		>
			<Item
				name="DeleteAccount · legal .btnDanger"
				where="Settings sheet (gear) · step 1 and the confirm step"
				uses="2 uses"
				note="Step 1 is the real component (on the mock API). Steps 2 and 'working' repeat its markup."
			>
				<Cell s="Step 1 (real)" size="full">
					<DeleteAccount />
				</Cell>
				<Cell s="Confirm" size="full">
					<section className={lg.delete}>
						<h2 className={lg.deleteTitle}>{t.confirmTitle}</h2>
						<div className={lg.deleteActions}>
							<button type="button" className={lg.btn}>
								{t.cancel}
							</button>
							<button type="button" className={`${lg.btn} ${lg.btnDanger}`}>
								{t.confirm}
							</button>
						</div>
					</section>
				</Cell>
				<Cell s="Working" size="full">
					<div className={lg.deleteActions} style={{ marginTop: 0 }}>
						<button type="button" className={lg.btn} disabled>
							{t.cancel}
						</button>
						<button
							type="button"
							className={`${lg.btn} ${lg.btnDanger}`}
							disabled
						>
							{t.working}
						</button>
					</div>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 5. icon buttons

function Icons() {
	return (
		<Section
			id="icons"
			title="Icon buttons"
			sub="Six shapes: bare round (gear, speaker, X), chamfered square (back), bare chevrons (arrows), a round boss (hourglass)."
		>
			<Item
				name="Gear · speaker"
				where="SettingsEntry (title .gear) and SoundToggle (audio .toggle), side by side in the Fragment tab header"
				uses="1 use each"
				note="Same look, defined twice (title.module.css and audio.module.css)."
			>
				<Cell s="Gear (real)">
					<SettingsEntry />
				</Cell>
				<Cell s="Gear · pressed ≈" force="soft">
					<SettingsEntry />
				</Cell>
				<Cell s="Speaker (real)">
					<SoundToggle />
				</Cell>
				<Cell s="On">
					<Speaker on />
				</Cell>
				<Cell s="Off">
					<Speaker on={false} />
				</Cell>
				<Cell s="Focus ≈" force="focus">
					<Speaker on />
				</Cell>
			</Item>

			<Item
				name="fragment .back · .arrow"
				where="Ritual back chevron (steps II, III) · carousel arrows either side of the rose"
				uses="1 + 2 uses"
				note="The back chevron is a framed slab; the carousel's are bare gilt."
			>
				<Cell s="Back">
					<button type="button" className={fr.back} aria-label="Back">
						<BackGlyph />
					</button>
				</Cell>
				<Cell s="Pressed ≈" force="press">
					<button type="button" className={fr.back} aria-label="Back">
						<BackGlyph />
					</button>
				</Cell>
				<Cell s="Disabled">
					<button type="button" className={fr.back} aria-label="Back" disabled>
						<BackGlyph />
					</button>
				</Cell>
				<Cell s="Focus ≈" force="focusIn">
					<button type="button" className={fr.back} aria-label="Back">
						<BackGlyph />
					</button>
				</Cell>
				<Cell s="Arrows">
					<button type="button" className={fr.arrow} aria-label="Previous mask">
						<Chevron flip />
					</button>
					<button type="button" className={fr.arrow} aria-label="Next mask">
						<Chevron />
					</button>
				</Cell>
				<Cell s="Pressed ≈" force="soft">
					<button type="button" className={fr.arrow} aria-label="Next mask">
						<Chevron />
					</button>
				</Cell>
			</Item>

			<Item
				name="gathering .sheetClose · .skip"
				where="Ledger sheet close X · Skip to the result (hourglass, the Gathering dock)"
				uses="1 + 1 use"
			>
				<Cell s="Close X">
					<div className={c.closeBox}>
						<button type="button" className={ga.sheetClose} aria-label="Close">
							<Cross />
						</button>
					</div>
				</Cell>
				<Cell s="Focus ≈" force="focus">
					<button
						type="button"
						className={ga.sheetClose}
						aria-label="Close"
						style={{ position: "static" }}
					>
						<Cross />
					</button>
				</Cell>
				<Cell s="Hourglass">
					<button type="button" className={ga.skip} aria-label="Skip">
						<Hourglass />
					</button>
				</Cell>
				<Cell s="Pressed ≈" force="soft">
					<button type="button" className={ga.skip} aria-label="Skip">
						<Hourglass />
					</button>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 6. tabs

function Tabs() {
	const [tab, setTab] = useState<Tab>("fragment");
	return (
		<Section
			id="tabs"
			title="Tabs · the ledge"
			sub="TabBar (src/ui/TabBar.tsx), real. Five ways, the Gathering on a raised round boss."
		>
			<Item
				name="TabBar · all open"
				where="Shell (every signed-in screen) · live: tap a way"
				uses="1 use · 5 ways"
				flush
			>
				<Cell s="On: the way you stand on" size="full">
					<div className={c.raise}>
						<TabBar tab={tab} onTab={setTab} />
					</div>
				</Cell>
			</Item>
			<Item
				name="TabBar · centre on, a way just opened"
				where="Gathering on (the boss lit) · Vestry lit (glows until visited)"
				uses="state"
				flush
			>
				<Cell s="Centre medallion on · lit" size="full">
					<div className={c.raise}>
						<TabBar tab="gathering" onTab={noop} lit={{ vestry: true }} />
					</div>
				</Cell>
			</Item>
			<Item
				name="TabBar · locked"
				where="Onboarding: ways not yet open sink dark with a padlock (a tap shakes and says what opens it)"
				uses="state"
				flush
			>
				<Cell s="Locked" size="full">
					<div className={c.raise}>
						<TabBar
							tab="fragment"
							onTab={noop}
							locked={{
								spire: true,
								gathering: true,
								reliquary: true,
								vestry: true,
							}}
						/>
					</div>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 7. chips / pickers

const STRIP_ON = 2;

function Pickers() {
	const [knobs, setKnobs] = useState<Knobs>({ ...DEFAULT_KNOBS, noise: 6 });
	return (
		<Section
			id="pickers"
			title="Chips and pickers"
			sub="Three tile pickers: mask chips, First Gesture tiles, wardrobe chips. Selected = gilt ring + glow in each, but three different sizes and frames."
		>
			<Item
				name="fragment .chip (mask strip)"
				where="Ritual step I, under the rose"
				uses="1 use · 7 chips"
				note="Unselected chips sit at 62% opacity."
			>
				<Cell s="Rest · one selected" size="full">
					<div className={fr.strip} style={{ margin: 0, padding: 0 }}>
						{[0, 1, 2, 3, 4, 5, 6].map((i) => (
							<button
								key={i}
								type="button"
								className={fr.chip}
								data-on={i === STRIP_ON ? "1" : "0"}
								aria-pressed={i === STRIP_ON}
							>
								<Mask aspect={i} size={34} shadow={false} />
							</button>
						))}
					</div>
				</Cell>
				<Cell s="Pressed ≈" force="soft">
					<button type="button" className={fr.chip} data-on="0">
						<Mask aspect={5} size={34} shadow={false} />
					</button>
				</Cell>
				<Cell s="Focus ≈" force="focus">
					<button type="button" className={fr.chip} data-on="0">
						<Mask aspect={5} size={34} shadow={false} />
					</button>
				</Cell>
			</Item>

			<Item
				name="SigilEditor · gesture tiles + notch rail"
				where="Ritual step II and the Retune sheet (real component, live)"
				uses="1 component · 2 places"
				note="Tiles take the gesture's colour when chosen (gilt, blood, bone). The rail: drag the rivet, tap a notch, or arrow keys."
			>
				<Cell s="Live (Appetite: First Gesture + Wavering)" size="full">
					<div className={c.stack}>
						<SigilEditor aspect={4} knobs={knobs} onChange={setKnobs} />
					</div>
				</Cell>
				<Cell s="Disabled (while carving)" size="full">
					<div className={c.stack}>
						<SigilEditor
							aspect={4}
							knobs={{ ...knobs, opening: 1 }}
							onChange={noop}
							disabled
						/>
					</div>
				</Cell>
			</Item>

			<Item
				name="vestry .chip (wardrobe)"
				where="Vestry wardrobe: finish, tint, title"
				uses="1 use · 3 slots"
				note="Whole slot dims while saving (fieldset disabled)."
			>
				<Cell s="Tint · one worn" size="full">
					<fieldset className={vs.slot}>
						<legend className={vs.slotName}>Tint</legend>
						<div className={vs.chips}>
							<button type="button" className={vs.chip} data-on="0">
								<DressedMask aspect={2} equipped={{}} size={28} />
								<span>None</span>
							</button>
							<button type="button" className={vs.chip} data-on="1">
								<ItemSwatch id="tint.night" aspect={2} size={28} />
								<span>{itemName("tint.night")}</span>
							</button>
							<button type="button" className={vs.chip} data-on="0">
								<ItemSwatch id="tint.bone" aspect={2} size={28} />
								<span>{itemName("tint.bone")}</span>
							</button>
						</div>
					</fieldset>
				</Cell>
				<Cell s="Title · saving (disabled)" size="full">
					<fieldset className={vs.slot} disabled>
						<legend className={vs.slotName}>Title</legend>
						<div className={vs.chips}>
							<button type="button" className={vs.chip} data-on="0">
								<span>No title</span>
							</button>
							<button type="button" className={vs.chip} data-on="1">
								<span>{itemName("title.unrepentant")}</span>
							</button>
						</div>
					</fieldset>
				</Cell>
				<Cell s="Focus ≈" force="focus">
					<button type="button" className={vs.chip} data-on="0">
						<ItemSwatch id="tint.oxblood" aspect={2} size={28} />
						<span>{itemName("tint.oxblood")}</span>
					</button>
				</Cell>
			</Item>

			<Item
				name="Look-alikes (not controls)"
				where="landing .chip (Built with) · reliquary .rarity · vestry .owned"
				uses="static"
				note="These read as chips or tags but do nothing on tap."
			>
				<Cell s="Landing chip">
					<span className={ld.chip}>Avalanche</span>
				</Cell>
				<Cell s="Rarity">
					<span className={rq.rarity} data-rarity="relic">
						Relic
					</span>
				</Cell>
				<Cell s="Owned tag">
					<span className={vs.owned}>Owned</span>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 8. switches

function SoundRow({
	label,
	on,
	disabled,
}: {
	label: string;
	on: boolean;
	disabled?: boolean;
}) {
	return (
		<li>
			<button
				type="button"
				role="switch"
				aria-checked={on}
				disabled={disabled}
				className={au.row}
			>
				<span>{label}</span>
				<span className={au.switch} aria-hidden="true" />
			</button>
		</li>
	);
}

function PushRow({ on, busy }: { on: boolean; busy?: boolean }) {
	return (
		<div className={hd.push} style={{ width: "100%" }}>
			<Bell on={on} />
			<span className={hd.pushText}>
				{busy ? M.notify.working : on ? M.notify.on : M.notify.offer}
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={on}
				className={hd.switch}
				data-on={on || undefined}
				disabled={busy}
			>
				<span
					className={hd.knob}
					style={on ? { transform: "translateX(22px)" } : undefined}
				/>
			</button>
		</div>
	);
}

function Switches() {
	return (
		<Section
			id="switches"
			title="Switches"
			sub="Two switch designs for the same job: the sound list's small pill and the notifications row's larger knob."
		>
			<Item
				name="SoundSettingsList · audio .switch"
				where="Fragment tab (under the Marks) · Settings sheet"
				uses="2 placements · 2-3 rows"
				note="40 × 22 pill; on = gilt-d track. Vibration is listed only where the device vibrates."
			>
				<Cell s="Live (real)" size="full">
					<SoundSettingsList />
				</Cell>
				<Cell s="On · off · disabled" size="full">
					<ul className={au.list} style={{ width: "100%" }}>
						<SoundRow label="Sound" on />
						<SoundRow label="Cathedral air" on={false} />
						<SoundRow label="Vibration" on={false} disabled />
					</ul>
				</Cell>
			</Item>
			<Item
				name="hud .switch (notifications)"
				where="Fragment tab HUD, the push row"
				uses="1 use"
				note="58 × 44 target, a sprung knob; on = gilt gradient track. Hidden where push is unsupported."
			>
				<Cell s="Off" size="full">
					<PushRow on={false} />
				</Cell>
				<Cell s="On" size="full">
					<PushRow on />
				</Cell>
				<Cell s="Busy (disabled)" size="full">
					<PushRow on={false} busy />
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 9. text input

function NameField({
	value,
	onChange,
	disabled,
	focus,
}: {
	value: string;
	onChange?: (v: string) => void;
	disabled?: boolean;
	focus?: boolean;
}) {
	const n = value.length;
	return (
		<label className={fr.nameField}>
			<span className="sr-only">Name</span>
			<input
				type="text"
				value={value}
				maxLength={24}
				placeholder="Up to 24 letters"
				onChange={(e) => onChange?.(e.target.value)}
				readOnly={!onChange}
				disabled={disabled}
				autoComplete="off"
				spellCheck={false}
				style={
					focus
						? {
								boxShadow:
									"inset 0 2px 6px #000, inset 0 0 0 1px var(--c-gilt), 0 0 14px #e3c27c33",
							}
						: undefined
				}
			/>
			{n >= 18 ? (
				<span className={fr.nameCount} data-full={n >= 24 ? "1" : undefined}>
					{n} / 24
				</span>
			) : null}
		</label>
	);
}

function TextInput() {
	const [name, setName] = useState("");
	return (
		<Section
			id="input"
			title="Text input"
			sub="The only text field in the game: the Fragment's name."
		>
			<Item
				name="fragment .nameField"
				where="Ritual step III (the count shows from 18 letters)"
				uses="1 use"
			>
				<Cell s="Empty (live: type)" size="full">
					<NameField value={name} onChange={setName} />
				</Cell>
				<Cell s="Filled" size="full">
					<NameField value="Severine" />
				</Cell>
				<Cell s="Focus ≈" size="full">
					<NameField value="Severine" focus />
				</Cell>
				<Cell s="Count · full" size="full">
					<NameField value="Severine of the Ninth Pane" />
				</Cell>
				<Cell s="Disabled (binding)" size="full">
					<NameField value="Severine" disabled />
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 10. links

function Links() {
	return (
		<Section
			id="links"
			title="Links"
			sub="Gilt throughout, but two underline rules: always underlined (inline, notice, seal, sources) and underline-on-hover (navigation)."
		>
			<Item
				name="Navigation links"
				where="LegalLinks (title foot, Settings, landing footer, legal pages) · BackLink (legal pages) · legal contents"
				uses="4 + 1 + 1 uses"
			>
				<Cell s="LegalLinks (real)" size="full">
					<LegalLinks />
				</Cell>
				<Cell s="Focus ≈" size="full">
					<nav className={lg.links}>
						<a
							href="/terms"
							style={{ textDecoration: "underline", textUnderlineOffset: 3 }}
						>
							Terms
						</a>
					</nav>
				</Cell>
				<Cell s="BackLink (real)">
					<BackLink />
				</Cell>
				<Cell s="Contents" size="full">
					<ol className={lg.tocList} style={{ columns: 1 }}>
						<li>
							<a href="#who">
								<span className={lg.tocNum}>1.</span>
								<span>Who we are</span>
							</a>
						</li>
					</ol>
				</Cell>
			</Item>
			<Item
				name="Inline and standalone links"
				where="Consent line (title) · prose (legal pages, 30) · All sources (Credits) · View seal (Marks)"
				uses="2 + 30 + 1 + 1 uses"
			>
				<Cell s="Consent (title .consent)" size="full">
					<p className={ti.consent}>
						{shell.title.consent.lead}{" "}
						<a href="/terms">{shell.title.consent.terms}</a>{" "}
						{shell.title.consent.and}{" "}
						<a href="/privacy">{shell.title.consent.privacy}</a>.
					</p>
				</Cell>
				<Cell s="Legal prose (.prose a)" size="full">
					<div className={lg.prose}>
						<p style={{ margin: 0 }}>
							Sign-in is handled by <a href="#privy">Privy</a>; write to{" "}
							<a href="#mail">us</a> any time.
						</p>
					</div>
				</Cell>
				<Cell s="All sources (title .leafRoll)">
					<a className={ti.leafRoll} href="#sources">
						All sources
					</a>
				</Cell>
				<Cell s="View seal (hud .sealLink)">
					<a className={hd.sealLink} href="#seal">
						View seal
					</a>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 11. sheets / handles

function Sheets() {
	return (
		<Section
			id="sheets"
			title="Sheet handles"
			sub="Two bottom sheets, two grips: round bone (drags) and square umber (decorative, the sheet does not drag). The Settings sheet has none."
		>
			<Item
				name="gathering .sheetHead · .grabber"
				where="Ledger of Light sheet: drag down, tap the scrim, X or Escape to close"
				uses="1 use"
				flush
			>
				<Cell s="Ledger sheet head" size="full">
					<div className={`${ga.root} ${c.gathering}`} style={{ padding: 0 }}>
						<div className={c.sheetBox}>
							<div className={ga.sheetHead}>
								<span className={ga.grabber} aria-hidden="true" />
								<h2 className={ga.sheetTitle}>Ledger of Light</h2>
								<button
									type="button"
									className={ga.sheetClose}
									aria-label="Close"
								>
									<Cross />
								</button>
							</div>
						</div>
					</div>
				</Cell>
			</Item>
			<Item
				name="fragment .sheetGrip"
				where="Retune sheet: scrim, Cancel or Escape to close"
				uses="1 use"
				flush
			>
				<Cell s="Retune sheet head" size="full">
					<div className={c.retuneBox}>
						<span className={fr.sheetGrip} aria-hidden="true" />
						<div className={fr.sheetHead}>
							<Mask aspect={2} size={48} glow />
							<div>
								<h2 className={fr.h2}>{L.hero.retuneHeading}</h2>
								<p className={fr.hint}>{L.hero.retuneHint}</p>
							</div>
						</div>
					</div>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 12. cards

function Cards({
	spire,
	marks,
}: {
	spire: SpireState | null;
	marks: MarksResponse | null;
}) {
	const rows = mockStandings({
		name: "Severine",
		aspect: 2,
		light: 47,
		duels: 9,
	});
	return (
		<Section
			id="cards"
			title="Cards and tokens that act as buttons"
			sub="Real components on the mock world (Spire 'mid', the Marks shelf, the standings)."
		>
			<Item
				name="Tower · spire .floor"
				where="Spire tab: tap an open or cleared floor to choose it"
				uses="1 use · 5 floors"
				note="Top to bottom: boss (locked), locked, open, cleared + selected, cleared."
			>
				<Cell s="Boss · locked · open · selected · cleared" size="full">
					{spire ? (
						<div className={c.stack}>
							<Tower
								floors={spire.floors}
								levelCap={spire.levelCap}
								selected={2}
								onSelect={noop}
							/>
						</div>
					) : (
						<p className={c.note}>Loading the tower…</p>
					)}
				</Cell>
			</Item>
			<Item
				name="LedgerButton · gathering .ledgerBtn"
				where="Gathering dock: tap or swipe up to open the Ledger"
				uses="1 use"
			>
				<Cell s="Rest (real)" size="full">
					<div className={`${ga.root} ${c.gathering}`}>
						<LedgerButton
							rows={rows}
							mine={SELF_AGENT.toLowerCase()}
							onOpen={noop}
						/>
					</div>
				</Cell>
				<Cell s="Pressed ≈" size="full">
					<div className={`${ga.root} ${c.gathering}`}>
						<div className={c.body} data-force="press">
							<LedgerButton
								rows={rows}
								mine={SELF_AGENT.toLowerCase()}
								onOpen={noop}
							/>
						</div>
					</div>
				</Cell>
			</Item>
			<Item
				name="MarksShelf · hud .medal"
				where="Fragment tab: tap a medal for its name and state"
				uses="1 use · one per Mark"
				note="Sealed = gilt coin; earned, sealing soon = dashed ring; open = bone outline."
			>
				<Cell s="Shelf (real)" size="full">
					{marks ? (
						<div className={c.stack}>
							<MarksShelf res={marks} />
						</div>
					) : (
						<p className={c.note}>Loading the Marks…</p>
					)}
				</Cell>
				<Cell s="Sealed">
					<button type="button" className={hd.medal} data-sealed>
						<span className={hd.medalFace}>II</span>
					</button>
				</Cell>
				<Cell s="Earned">
					<button type="button" className={hd.medal}>
						<span className={hd.medalFace}>I</span>
					</button>
				</Cell>
				<Cell s="Open">
					<button type="button" className={hd.medal} data-sealed data-on>
						<span className={hd.medalFace}>VI</span>
					</button>
				</Cell>
			</Item>
			<Item
				name="fragment .sealButton · WaxSeal"
				where="Fragment tab, awaiting the seal: press the wax"
				uses="1 use"
				note="A beckoning gilt ring while it can be pressed."
			>
				<Cell s="Live">
					<button
						type="button"
						className={fr.sealButton}
						data-live="1"
						aria-label="Seal"
					>
						<WaxSeal aspect={2} state="poured" size={116} />
					</button>
				</Cell>
				<Cell s="Not yet (cold)">
					<button
						type="button"
						className={fr.sealButton}
						data-live="0"
						disabled
						aria-label="Seal"
					>
						<WaxSeal aspect={2} state="cold" size={116} />
					</button>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 13. landing

function Landing() {
	return (
		<Section
			id="landing"
			title="Landing (desktop)"
			sub="The public page at /: Play is the wax PrimaryLink; the rest are links and static chips. The landing's desktop rules start at 960px (the QR link is styled only there), so a 900px capture shows its tablet rules."
		>
			<Item
				name="Landing controls"
				where="Hero and closing Play · contract link · QR short URL · footer"
				uses="2 + 1 + 1 + 2 + LegalLinks"
				wide
			>
				<div className={c.landing}>
					<div className={c.landingCol}>
						<span className={c.state}>Play (hero)</span>
						<PrimaryLink href="#" hero className={ld.playFit}>
							Play
						</PrimaryLink>
						<span className={c.state}>Explorer link</span>
						<a
							className={ld.explorer}
							href="#explorer"
							style={{ marginTop: 0 }}
						>
							Arena contract on Snowtrace (Fuji)
							<span className={ld.addr}>0x1234…abcd</span>
							<span aria-hidden="true">↗</span>
						</a>
						<span className={c.state}>QR short URL</span>
						<a href="#qr" className={ld.qrUrl}>
							apostasy.game/play
						</a>
					</div>
					<div className={c.landingCol}>
						<span className={c.state}>Footer</span>
						<nav className={ld.footNav}>
							<a href="#gh">Source on GitHub</a>
							<a href="#credits">Credits</a>
						</nav>
						<LegalLinks />
						<span className={c.state}>Built with (static)</span>
						<ul className={ld.chips}>
							<li className={ld.chip}>Next.js</li>
							<li className={ld.chip}>Avalanche Fuji</li>
							<li className={ld.chip}>ERC-4337</li>
						</ul>
					</div>
				</div>
			</Item>
		</Section>
	);
}
