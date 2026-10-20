"use client";

/**
 * The control SYSTEM on one sheet (dev only, /_brand/controls): every component in
 * src/ui/controls plus the wax primary, in every state, then composed the way the screens
 * will use them. Pressed and focus are held by each component's own `pressed` / `focused`
 * props, so they are the real looks, not approximations. The controls as they stand in the
 * screens today: /_brand/controls?before=1. API and rules: src/ui/CONTROLS.md ("System").
 */
import { type ReactNode, useId, useState } from "react";
import { PrimaryButton } from "@/ui/button";
import {
	Chip,
	ControlNote,
	DangerButton,
	GLYPHS,
	type GlyphName,
	Grip,
	IconButton,
	link,
	SecondaryButton,
	SelectableCard,
	Switch,
	TextButton,
	TextInput,
} from "@/ui/controls";
import { Mask } from "@/ui/Mask";
import c from "./controls.module.css";
import x from "./system.module.css";

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
	use,
	replaces,
	note,
	wide,
	children,
}: {
	name: string;
	use: string;
	replaces?: string;
	note?: string;
	wide?: boolean;
	children: ReactNode;
}) {
	return (
		<article className={c.item} data-wide={wide || undefined}>
			<header className={c.cap}>
				<h3 className={c.name}>{name}</h3>
				<p className={c.where}>{use}</p>
				{replaces ? (
					<p className={c.where}>
						<span className={c.uses}>replaces</span> {replaces}
					</p>
				) : null}
			</header>
			<div className={c.cells}>{children}</div>
			{note ? <p className={c.note}>{note}</p> : null}
		</article>
	);
}

function Cell({
	s,
	size,
	children,
}: {
	s: string;
	size?: "full" | "half";
	children: ReactNode;
}) {
	return (
		<div className={c.cell} data-size={size}>
			<span className={c.state}>{s}</span>
			<div className={c.body}>{children}</div>
		</div>
	);
}

/** A button with its caption line, wired by aria-describedby. */
function WithNote({
	note,
	tone,
	children,
}: {
	note: string;
	tone?: "muted" | "warn" | "gilt";
	children: (id: string) => ReactNode;
}) {
	const id = useId();
	return (
		<div className={x.stack}>
			{children(id)}
			<ControlNote id={id} tone={tone}>
				{note}
			</ControlNote>
		</div>
	);
}

/** BindRitual's star, as a SecondaryButton glyph. */
function Star() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
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

/** Hud's bell (the notifications row). */
function Bell() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M12 3a5 5 0 0 0-5 5v3.2c0 1.3-.5 2.6-1.4 3.6L4.5 16h15l-1.1-1.2a5.3 5.3 0 0 1-1.4-3.6V8a5 5 0 0 0-5-5Zm-2 15a2 2 0 0 0 4 0"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

// ---------------------------------------------------------------- the sheet

export function SystemClient() {
	return (
		<main className={c.page} data-ready="1">
			<header className={c.head}>
				<h1 className={c.h1}>Controls · System</h1>
				<p className={c.lede}>
					One family for every control, from <code>src/ui/controls</code> and
					the wax primary (<code>src/ui/button</code>). Pressed and focus are
					held by the components&apos; own props: these are the real looks. Each
					card is one phone column (390). The controls as the screens draw them
					today:{" "}
					<a className={link.inline} href="?before=1">
						?before=1
					</a>
					. Rules and API: <code>src/ui/CONTROLS.md</code> (System).
				</p>
			</header>

			<Family />
			<Primary />
			<Secondary />
			<Danger />
			<Text />
			<Icons />
			<Switches />
			<Chips />
			<Cards />
			<Fields />
		</main>
	);
}

// ---------------------------------------------------------------- 0. the family at a glance

function Family() {
	return (
		<Section
			id="family"
			title="The family"
			sub="One silhouette language: red wax for the one main action, umber wax for the second, iron for the destructive, gilt words for the way out, stone tokens for icons, chamfered frames for things you pick. One ring for focus, everywhere, around the real shape."
		>
			<Item
				name="Hierarchy in one column"
				use="Primary > Secondary > Text. Danger only in a confirm."
			>
				<Cell s="A screen's foot" size="full">
					<div className={x.stack}>
						<PrimaryButton hero>Climb XIV</PrimaryButton>
						<SecondaryButton size="lg">Retune</SecondaryButton>
						<TextButton>Skip</TextButton>
					</div>
				</Cell>
				<Cell s="A confirm" size="full">
					<div className={x.stack}>
						<DangerButton>Delete my account</DangerButton>
						<TextButton>Keep my account</TextButton>
					</div>
				</Cell>
			</Item>
			<Item
				name="Focus, every shape"
				use="The same 2px gilt ring past a 2px soot gap, drawn from each control's silhouette (src/ui/controls/defs.ts)."
			>
				<Cell s="Wax: bar + seal" size="full">
					<PrimaryButton focused>Bind</PrimaryButton>
				</Cell>
				<Cell s="Umber bar" size="half">
					<SecondaryButton focused>Retune</SecondaryButton>
				</Cell>
				<Cell s="Iron bar" size="half">
					<DangerButton focused>Delete</DangerButton>
				</Cell>
				<Cell s="Token · chip · switch">
					<div className={x.row}>
						<IconButton icon="gear" label="Settings" focused />
						<Chip focused>Mercy</Chip>
						<Switch bare checked label="Sound" focused />
					</div>
				</Cell>
				<Cell s="Chamfered card" size="full">
					<Floor n={4} focused />
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 1. primary (wax, fixed)

function Primary() {
	return (
		<Section
			id="primary"
			title="Primary · wax (fixed)"
			sub="PrimaryButton / PrimaryLink. Loading light and the focus ring now sit under the seal: wax < light < seal < label. Labels are the action plus at most one number; the reason goes in a ControlNote below."
		>
			<Item name="PrimaryButton · lg" use="Enter, Bind, Climb, Scry, Continue">
				<Cell s="Rest" size="full">
					<PrimaryButton>Bind</PrimaryButton>
				</Cell>
				<Cell s="Pressed" size="full">
					<PrimaryButton pressed>Bind</PrimaryButton>
				</Cell>
				<Cell s="Focus" size="full">
					<PrimaryButton focused>Bind</PrimaryButton>
				</Cell>
				<Cell s="Loading 12% (light leaving the seal)" size="full">
					<PrimaryButton disabled loading progress={0.12}>
						Binding…
					</PrimaryButton>
				</Cell>
				<Cell s="Loading 60%" size="full">
					<PrimaryButton disabled loading progress={0.6}>
						Binding…
					</PrimaryButton>
				</Cell>
				<Cell s="Loading (indeterminate)" size="full">
					<PrimaryButton disabled loading>
						Binding…
					</PrimaryButton>
				</Cell>
				<Cell s="Disabled + reason" size="full">
					<WithNote note="Next climb in 3h 20m">
						{(id) => (
							<PrimaryButton disabled aria-describedby={id}>
								Climb XIV
							</PrimaryButton>
						)}
					</WithNote>
				</Cell>
			</Item>
			<Item
				name="PrimaryButton · md"
				use="Collect, Save, Buy"
				note="Before, the reason sat in the label and wrapped to two lines ('5 USDC · not enough'). Now: the action and the price, and the balance underneath."
			>
				<Cell s="Rest" size="half">
					<PrimaryButton size="md">Buy · 5 USDC</PrimaryButton>
				</Cell>
				<Cell s="Pressed" size="half">
					<PrimaryButton size="md" pressed>
						Buy · 5 USDC
					</PrimaryButton>
				</Cell>
				<Cell s="Focus" size="half">
					<PrimaryButton size="md" focused>
						Buy · 5 USDC
					</PrimaryButton>
				</Cell>
				<Cell s="Loading" size="half">
					<PrimaryButton size="md" disabled loading progress={0.45}>
						Buying…
					</PrimaryButton>
				</Cell>
				<Cell s="Disabled + reason (was: '5 USDC · not enough')" size="full">
					<WithNote note="You have 4.00 USDC" tone="warn">
						{(id) => (
							<PrimaryButton size="md" disabled aria-describedby={id}>
								Buy · 5 USDC
							</PrimaryButton>
						)}
					</WithNote>
				</Cell>
				<Cell s="Ready + status" size="full">
					<WithNote note="Gathered while you were away" tone="gilt">
						{() => <PrimaryButton size="md">Collect · 340</PrimaryButton>}
					</WithNote>
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
			title="SecondaryButton"
			sub="Dark umber wax, the same uneven edge, a small gilt seal at the leading end, a gilt Grenze label. Clearly second to the red wax."
		>
			<Item
				name="SecondaryButton · md"
				use="The second action: Retune, Try again, Wear it, Suggest a name"
				replaces=".btn.btn-ghost, fragment .divine, reliquary .wear, title .leafClose"
			>
				<Cell s="Rest" size="half">
					<SecondaryButton>Retune</SecondaryButton>
				</Cell>
				<Cell s="Pressed" size="half">
					<SecondaryButton pressed>Retune</SecondaryButton>
				</Cell>
				<Cell s="Focus" size="half">
					<SecondaryButton focused>Try again</SecondaryButton>
				</Cell>
				<Cell s="Loading" size="half">
					<SecondaryButton disabled loading progress={0.5}>
						Wearing…
					</SecondaryButton>
				</Cell>
				<Cell s="Disabled + reason" size="full">
					<WithNote note="You are wearing it">
						{(id) => (
							<SecondaryButton disabled aria-describedby={id}>
								Wear it
							</SecondaryButton>
						)}
					</WithNote>
				</Cell>
				<Cell s="Own glyph" size="full">
					<SecondaryButton icon={<Star />}>Suggest a name</SecondaryButton>
				</Cell>
			</Item>
			<Item
				name="SecondaryButton · lg and inline"
				use="Beside a primary; in a row"
			>
				<Cell s="lg" size="full">
					<SecondaryButton size="lg">Retune</SecondaryButton>
				</Cell>
				<Cell s="Inline, no glyph">
					<SecondaryButton inline icon={null}>
						Close
					</SecondaryButton>
				</Cell>
				<Cell s="The Retune sheet's foot" size="full">
					<div className={x.foot}>
						<TextButton>Cancel</TextButton>
						<PrimaryButton size="md">Save</PrimaryButton>
					</div>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 3. danger

function Danger() {
	return (
		<Section
			id="danger"
			title="DangerButton"
			sub="The broken seal: dark iron, a cracked red seal, a red label (5:1). Only for the destructive confirm, always beside a way back."
		>
			<Item
				name="DangerButton"
				use="Delete my account / Yes, delete it"
				replaces="legal .btn.btnDanger"
			>
				<Cell s="Rest" size="half">
					<DangerButton>Delete it</DangerButton>
				</Cell>
				<Cell s="Pressed" size="half">
					<DangerButton pressed>Delete it</DangerButton>
				</Cell>
				<Cell s="Focus" size="half">
					<DangerButton focused>Delete it</DangerButton>
				</Cell>
				<Cell s="Loading" size="half">
					<DangerButton disabled loading>
						Deleting…
					</DangerButton>
				</Cell>
				<Cell s="Disabled" size="half">
					<DangerButton disabled>Delete it</DangerButton>
				</Cell>
				<Cell s="The confirm" size="full">
					<div className={x.stack}>
						<WithNote note="Your Fragment, Marks and Ash go for good">
							{(id) => (
								<DangerButton size="lg" aria-describedby={id}>
									Yes, delete it
								</DangerButton>
							)}
						</WithNote>
						<TextButton>Keep my account</TextButton>
					</div>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 4. text

function Text() {
	return (
		<Section
			id="text"
			title="TextButton"
			sub="Gilt Cinzel small caps on an invisible 44px target. Every quiet way out."
		>
			<Item
				name="TextButton"
				use="Skip, Cancel, Credits, Keep my account, Got it"
				replaces="practice / coach / spire .skip, title .colophonLink, legal .btn, legal .noticeDismiss"
			>
				<Cell s="Rest">
					<div className={x.row}>
						<TextButton>Skip</TextButton>
						<TextButton>Cancel</TextButton>
						<TextButton>Credits</TextButton>
						<TextButton>Got it</TextButton>
					</div>
				</Cell>
				<Cell s="Pressed">
					<TextButton pressed>Skip</TextButton>
				</Cell>
				<Cell s="Focus">
					<TextButton focused>Skip</TextButton>
				</Cell>
				<Cell s="Disabled">
					<TextButton disabled>Skip</TextButton>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 5. icons

const ALL = Object.keys(GLYPHS) as GlyphName[];

function Icons() {
	const [on, setOn] = useState(true);
	return (
		<Section
			id="icons"
			title="IconButton"
			sub="A round stone token with a gilt glyph. md 46px; sm a 36px token in a 44px target."
		>
			<Item
				name="IconButton · md"
				use="Carousel arrows, ritual back, the hourglass skip, sheet close"
				replaces="fragment .arrow / .back, gathering .sheetClose / .skip"
			>
				<Cell s="Every glyph">
					<div className={x.row}>
						{ALL.map((g) => (
							<IconButton key={g} icon={g} label={g} />
						))}
					</div>
				</Cell>
				<Cell s="Pressed">
					<IconButton icon="next" label="Next" pressed />
				</Cell>
				<Cell s="Focus">
					<IconButton icon="next" label="Next" focused />
				</Cell>
				<Cell s="Disabled">
					<IconButton icon="next" label="Next" disabled />
				</Cell>
			</Item>
			<Item
				name="IconButton · sm"
				use="Header chrome: settings gear, speaker"
				replaces="title .gear, audio .toggle"
			>
				<Cell s="Every glyph">
					<div className={x.row}>
						{ALL.map((g) => (
							<IconButton key={g} icon={g} label={g} size="sm" />
						))}
					</div>
				</Cell>
				<Cell s="Speaker toggle (tap it)">
					<IconButton
						icon={on ? "speaker" : "speakerOff"}
						label={on ? "Mute sound" : "Turn sound on"}
						size="sm"
						aria-pressed={on}
						onClick={() => setOn((v) => !v)}
					/>
				</Cell>
				<Cell s="Focus">
					<IconButton icon="gear" label="Settings" size="sm" focused />
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 6. switches

function Switches() {
	const [s, set] = useState({
		sound: true,
		air: false,
		buzz: true,
		bell: false,
	});
	return (
		<Section
			id="switches"
			title="Switch"
			sub="One switch for every setting: a carved groove, a stone knob that slides to a gilt boss. The row is the target; the ring follows the groove."
		>
			<Item
				name="Switch · rows (tap them)"
				use="Sound, Cathedral air, Vibration, Notifications"
				replaces="audio .row .switch, hud .switch .knob"
			>
				<Cell s="Settings list" size="full">
					<div className={x.list}>
						<Switch
							checked={s.sound}
							onChange={(v) => set({ ...s, sound: v })}
							label="Sound"
						/>
						<Switch
							checked={s.air}
							onChange={(v) => set({ ...s, air: v })}
							label="Cathedral air"
							hint="The organ and the wind"
						/>
						<Switch
							checked={s.buzz}
							onChange={(v) => set({ ...s, buzz: v })}
							label="Vibration"
						/>
						<Switch
							checked={s.bell}
							onChange={(v) => set({ ...s, bell: v })}
							label="Notifications"
							hint="When your Light is ready"
							icon={<Bell />}
						/>
					</div>
				</Cell>
			</Item>
			<Item name="Switch · states" use="Held by props">
				<Cell s="Off · pressed" size="full">
					<Switch checked={false} label="Sound" pressed />
				</Cell>
				<Cell s="On · focus" size="full">
					<Switch checked label="Sound" focused />
				</Cell>
				<Cell s="Disabled + reason" size="full">
					<div className={x.stack}>
						<Switch checked={false} label="Vibration" disabled />
						<ControlNote align="start">This phone cannot vibrate</ControlNote>
					</div>
				</Cell>
				<Cell s="Bare">
					<div className={x.row}>
						<Switch bare checked={false} label="Sound" />
						<Switch bare checked label="Sound" />
						<Switch bare checked label="Sound" disabled />
					</div>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 7. chips

function Chips() {
	const [aspect, setAspect] = useState(2);
	const [gesture, setGesture] = useState("Mercy");
	return (
		<Section
			id="chips"
			title="Chip"
			sub="A selectable token in the frame language: umber rim at rest, the gilt rim and glow when chosen; corners and ring follow the chamfer (or the coin)."
		>
			<Item
				name="Chip · lg masks (tap them)"
				use="The mask strip under the rose"
				replaces="fragment .chip"
			>
				<Cell s="Strip" size="full">
					<div className={x.row}>
						{[0, 1, 2, 3, 4].map((i) => (
							<Chip
								key={i}
								size="lg"
								selected={aspect === i}
								onClick={() => setAspect(i)}
								aria-label={`Mask ${i + 1}`}
							>
								<Mask aspect={i} size={38} shadow={false} />
							</Chip>
						))}
					</div>
				</Cell>
			</Item>
			<Item
				name="Chip · md, radio set (tap them)"
				use="First Gesture, wardrobe slots"
				replaces="fragment .gesture, vestry .chip"
			>
				<Cell s="role=radiogroup" size="full">
					<div className={x.row} role="radiogroup" aria-label="First Gesture">
						{["Mercy", "Wrath", "Silence"].map((g) => (
							<Chip
								key={g}
								kind="radio"
								selected={gesture === g}
								onClick={() => setGesture(g)}
							>
								{g}
							</Chip>
						))}
					</div>
				</Cell>
				<Cell s="Pressed">
					<Chip pressed>Wrath</Chip>
				</Cell>
				<Cell s="Focus">
					<Chip focused>Wrath</Chip>
				</Cell>
				<Cell s="Selected + focus">
					<Chip selected focused>
						Mercy
					</Chip>
				</Cell>
				<Cell s="Disabled">
					<Chip disabled>Silence</Chip>
				</Cell>
			</Item>
			<Item
				name="Chip · round (coins)"
				use="Marks medals"
				replaces="hud .medal"
			>
				<Cell s="Rest · selected · focus · disabled">
					<div className={x.row}>
						<Chip shape="round" size="lg" aria-label="Mark I">
							<span className={x.coin}>I</span>
						</Chip>
						<Chip shape="round" size="lg" selected aria-label="Mark II">
							<span className={x.coin}>II</span>
						</Chip>
						<Chip shape="round" size="lg" focused aria-label="Mark III">
							<span className={x.coin}>III</span>
						</Chip>
						<Chip shape="round" size="lg" disabled aria-label="Mark IV">
							<span className={x.coin}>IV</span>
						</Chip>
					</div>
				</Cell>
			</Item>
		</Section>
	);
}

// ---------------------------------------------------------------- 8. cards

const ROMAN = ["", "I", "II", "III", "IV", "V"];
const FLOORS = [
	{ n: 5, name: "The Lantern", sub: "Wrath · needs 300 Light", boss: true },
	{ n: 4, name: "The Choir", sub: "Mercy · needs 180 Light" },
	{ n: 3, name: "The Nave", sub: "Silence · needs 120 Light", tag: "Cleared" },
];

function Floor({
	n,
	selected,
	focused,
	pressed,
	locked,
	boss,
}: {
	n: number;
	selected?: boolean;
	focused?: boolean;
	pressed?: boolean;
	locked?: boolean;
	boss?: boolean;
}) {
	const f = FLOORS.find((v) => v.n === n) ?? FLOORS[1];
	if (!f) return null;
	const isBoss = boss ?? f.boss ?? false;
	return (
		<SelectableCard
			className={x.floor}
			data-boss={isBoss || undefined}
			tone={isBoss ? "blood" : undefined}
			selected={locked ? false : !!selected}
			focused={focused}
			pressed={pressed}
			disabled={locked}
			aria-label={`Floor ${ROMAN[f.n]}, ${f.name}`}
		>
			<span className={x.floorNum} data-cleared={f.tag ? "" : undefined}>
				{ROMAN[f.n]}
			</span>
			<Mask
				aspect={f.n % 5}
				size={isBoss ? 52 : 42}
				variant={f.tag ? "ink" : "grisaille"}
			/>
			<span className={x.floorText}>
				<span className={x.floorName}>{f.name}</span>
				<span className={x.floorSub}>
					{locked ? "Clear the floor below" : f.sub}
				</span>
			</span>
			<span className={x.floorTag}>{locked ? "Locked" : (f.tag ?? "")}</span>
		</SelectableCard>
	);
}

function Cards() {
	const [sel, setSel] = useState(4);
	return (
		<Section
			id="cards"
			title="SelectableCard"
			sub="The frame for every card you tap. Rim and face are cut to one chamfer, so the gilt selected rim and the focus ring turn the corners with it (they were square or clipped before)."
		>
			<Item name="Spire floors (tap them)" use="Tower" replaces="spire .floor">
				<Cell s="The tower" size="full">
					<div className={x.list}>
						{FLOORS.map((f) => (
							<SelectableCard
								key={f.n}
								className={x.floor}
								data-boss={f.boss || undefined}
								tone={f.boss ? "blood" : undefined}
								selected={sel === f.n}
								onClick={() => setSel(f.n)}
								aria-label={`Floor ${ROMAN[f.n]}, ${f.name}`}
							>
								<span
									className={x.floorNum}
									data-cleared={f.tag ? "" : undefined}
								>
									{ROMAN[f.n]}
								</span>
								<Mask
									aspect={f.n % 5}
									size={f.boss ? 52 : 42}
									variant={f.tag ? "ink" : "grisaille"}
								/>
								<span className={x.floorText}>
									<span className={x.floorName}>{f.name}</span>
									<span className={x.floorSub}>{f.sub}</span>
								</span>
								<span className={x.floorTag}>{f.tag ?? ""}</span>
							</SelectableCard>
						))}
					</div>
				</Cell>
			</Item>
			<Item name="Floor states" use="Held by props">
				<Cell s="Focus" size="full">
					<Floor n={4} focused />
				</Cell>
				<Cell s="Selected + focus" size="full">
					<Floor n={4} selected focused />
				</Cell>
				<Cell s="Boss · focus" size="full">
					<Floor n={5} focused />
				</Cell>
				<Cell s="Pressed" size="full">
					<Floor n={3} pressed />
				</Cell>
				<Cell s="Locked" size="full">
					<Floor n={4} locked />
				</Cell>
			</Item>
			<Item
				name="Ledger of Light plaque"
				use="The Gathering's foot (opens the Ledger sheet)"
				replaces="gathering .ledgerBtn"
			>
				<Cell s="Rest" size="full">
					<Ledger />
				</Cell>
				<Cell s="Focus" size="full">
					<Ledger focused />
				</Cell>
				<Cell s="Pressed" size="full">
					<Ledger pressed />
				</Cell>
			</Item>
		</Section>
	);
}

function Ledger({
	focused,
	pressed,
}: {
	focused?: boolean;
	pressed?: boolean;
}) {
	return (
		<SelectableCard
			className={x.ledger}
			focused={focused}
			pressed={pressed}
			aria-haspopup="dialog"
			aria-label="Open the Ledger of Light"
		>
			<span className={x.ledgerMasks} aria-hidden="true">
				<Mask aspect={0} size={30} />
				<Mask aspect={2} size={30} />
				<Mask aspect={4} size={30} />
			</span>
			<span className={x.ledgerText}>
				<span className={x.rubric}>Ledger of Light</span>
				<span className={x.floorSub}>You stand fourth</span>
			</span>
			<span className={x.chev} aria-hidden="true">
				{GLYPHS.next}
			</span>
		</SelectableCard>
	);
}

// ---------------------------------------------------------------- 9. fields, notes, links, grip

function Fields() {
	const [name, setName] = useState("Brother Ash");
	return (
		<Section
			id="fields"
			title="TextInput · ControlNote · links · Grip"
			sub="The name field in Grenze roman (no blackletter on controls); the caption line under a button; the one link rule; the one sheet grip."
		>
			<Item
				name="TextInput"
				use="The Fragment's name"
				replaces="fragment .nameField input"
			>
				<Cell s="lg (type in it)" size="full">
					<WithNote note={`${18 - name.length} letters left`}>
						{(id) => (
							<TextInput
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={18}
								aria-label="Name your Fragment"
								aria-describedby={id}
								placeholder="Name your Fragment"
							/>
						)}
					</WithNote>
				</Cell>
				<Cell s="Focus (held)" size="full">
					<TextInput
						defaultValue="Brother Ash"
						aria-label="Name"
						focused
						readOnly
					/>
				</Cell>
				<Cell s="Empty · md" size="full">
					<TextInput
						size="md"
						placeholder="Search the Ledger"
						aria-label="Search"
					/>
				</Cell>
				<Cell s="Disabled" size="full">
					<TextInput defaultValue="Sealed" aria-label="Name" disabled />
				</Cell>
			</Item>
			<Item name="ControlNote" use="The line under a button">
				<Cell s="muted · warn · gilt" size="full">
					<div className={x.stack}>
						<ControlNote>Next climb in 3h 20m</ControlNote>
						<ControlNote tone="warn">You have 4.00 USDC</ControlNote>
						<ControlNote tone="gilt">Free today</ControlNote>
					</div>
				</Cell>
			</Item>
			<Item
				name="Links"
				use="link.inline in running text; link.nav standing alone"
				replaces="the twelve link styles in CONTROLS.md §10"
			>
				<Cell s="Inline (always underlined)" size="full">
					<p className={x.prose}>
						By entering you accept the{" "}
						<a className={link.inline} href="#terms">
							Terms
						</a>{" "}
						and the{" "}
						<a className={link.inline} href="#privacy">
							Privacy notice
						</a>
						.
					</p>
				</Cell>
				<Cell s="Nav (underlined on hover / focus)" size="full">
					<nav className={x.row} aria-label="Legal">
						<a className={link.nav} href="#terms">
							Terms
						</a>
						<a className={link.nav} href="#privacy">
							Privacy
						</a>
						<a className={link.nav} href="#cookies">
							Cookies
						</a>
					</nav>
				</Cell>
			</Item>
			<Item
				name="Grip"
				use="Every bottom sheet"
				replaces="gathering .grabber, fragment .sheetGrip"
			>
				<Cell s="On a sheet" size="full">
					<div className={c.sheetBox}>
						<Grip />
						<p className={x.sheetTitle}>Retune</p>
					</div>
				</Cell>
			</Item>
		</Section>
	);
}
