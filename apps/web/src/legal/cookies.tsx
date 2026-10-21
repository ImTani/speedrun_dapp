import type { ReactNode } from "react";
import { Doc, Ext, Mail } from "./bits.tsx";
import { GAME_NAME, LINKS, NOTICE_KEY, OPERATOR_NAME } from "./config.ts";
import s from "./legal.module.css";
import type { LegalDoc } from "./types.ts";

interface StorageItem {
	name: string;
	/** Storage key or cache name, where it is ours and fixed. */
	key?: string;
	kind: string;
	purpose: ReactNode;
	lasts: string;
}

/**
 * Everything the game keeps in the browser. Keep in step with the code: localStorage keys in
 * src/client (marks.ts, inventory.ts), src/ui/tune, the settings and hint modules, NOTICE_KEY, and
 * the cache names in public/sw.js.
 */
const ITEMS: StorageItem[] = [
	{
		name: "Sign-in session (Privy)",
		kind: "Cookies and local storage, set by Privy",
		purpose: (
			<>
				Keeps you signed in and protects your wallet. Privy&rsquo;s secure
				wallet frame keeps its own storage too. See{" "}
				<Ext href={LINKS.privyPrivacy}>Privy&rsquo;s privacy policy</Ext>.
			</>
		),
		lasts: "Until you sign out or the session expires",
	},
	{
		name: "Sound and haptics",
		kind: "Local storage",
		purpose: "Remembers whether sound is muted and whether vibration is on.",
		lasts: "Until you clear it",
	},
	{
		name: "Hints",
		key: "apostasy.hints.*, apostasy.intro.seen",
		kind: "Local storage",
		purpose:
			"Remembers which introductions and hints you have already seen, so they show once.",
		lasts: "Until you clear it",
	},
	{
		name: "Marks already shown",
		key: "apostasy.marks.seen",
		kind: "Local storage",
		purpose: "So a Mark you have seen is not announced again.",
		lasts: "Until you clear it",
	},
	{
		name: "Purchases in progress",
		key: "vestry.pending",
		kind: "Local storage",
		purpose:
			"Holds the reference of a Vestry payment that has been sent but not yet added, so it can finish if you close the app.",
		lasts: "Until the purchase is added",
	},
	{
		name: "Display tuning",
		key: "arena.tune.*",
		kind: "Local storage",
		purpose: "Saves display adjustments, only if you open the tuning panel.",
		lasts: "Until you clear it",
	},
	{
		name: "This notice",
		key: NOTICE_KEY,
		kind: "Local storage",
		purpose: "Remembers that you dismissed the storage notice.",
		lasts: "Until you clear it",
	},
	{
		name: "Offline copy of the game",
		key: "apostasy-static-*, apostasy-pages-*",
		kind: "Service worker cache",
		purpose:
			"Game files (code, styles, fonts, images and the last pages opened) so the app opens quickly and works offline. Holds no personal data.",
		lasts: "Until the game updates or you clear it",
	},
	{
		name: "Notifications (only if you turn them on)",
		kind: "Push subscription, held by your browser",
		purpose: "Lets us tell you when a Gathering starts.",
		lasts: "Until you turn notifications off",
	},
];

function Items() {
	return (
		<ul className={s.items}>
			{ITEMS.map((it) => (
				<li key={it.name} className={s.item}>
					<div className={s.itemName}>{it.name}</div>
					{it.key ? <div className={s.itemKey}>{it.key}</div> : null}
					<div className={s.itemRow}>
						<span className={s.itemLabel}>Type: </span>
						{it.kind}
					</div>
					<div className={s.itemRow}>
						<span className={s.itemLabel}>Why: </span>
						{it.purpose}
					</div>
					<div className={s.itemRow}>
						<span className={s.itemLabel}>Kept: </span>
						{it.lasts}
					</div>
				</li>
			))}
		</ul>
	);
}

export const cookies: LegalDoc = {
	slug: "cookies",
	title: "Cookie Policy",
	description: `Every cookie and browser storage item ${GAME_NAME} uses, and why none of them track you.`,
	summary: [
		<>
			We only use storage needed to sign you in, run the game and remember your
			settings.
		</>,
		<>No analytics, advertising or tracking cookies, from us or anyone else.</>,
		<>
			Because everything is strictly necessary, there is nothing to consent to;
			the notice is there to tell you.
		</>,
	],
	sections: [
		{
			id: "what",
			title: "Cookies and browser storage",
			body: (
				<p>
					Cookies are small files a website keeps in your browser. Local storage
					and the service worker cache do a similar job: they let the game
					remember things on your device. This policy covers all of them, and we
					call them &ldquo;storage&rdquo;.
				</p>
			),
		},
		{
			id: "list",
			title: "What we use",
			body: (
				<>
					<p>
						Everything below is strictly necessary for the game you asked to
						play. Items we set stay on your device and are not sent to our
						servers, except the payment reference, which is sent once to add
						your purchase.
					</p>
					<Items />
				</>
			),
		},
		{
			id: "no-tracking",
			title: "What we do not use",
			body: (
				<p>
					No analytics, advertising, social media or tracking cookies or pixels.
					Our fonts are served from our own site, so no font service sees your
					visit either.
				</p>
			),
		},
		{
			id: "consent",
			title: "Why we do not ask for consent",
			body: (
				<>
					<p>
						European and UK rules (the ePrivacy Directive and PECR) require
						consent for storage on your device, except storage that is strictly
						necessary to provide a service you have asked for. Everything we use
						falls under that exception, so we tell you about it instead of
						asking.
					</p>
					<p>
						If we ever want to add anything that is not strictly necessary, such
						as analytics, we will ask you first and you will be free to say no.
					</p>
				</>
			),
		},
		{
			id: "others",
			title: "Other sites",
			body: (
				<p>
					If you sign in with Google, Google may set its own cookies on its own
					site during sign-in. Links to blockchain explorers and to our
					providers open their sites, which have their own cookie policies.
				</p>
			),
		},
		{
			id: "control",
			title: "Clearing storage",
			body: (
				<p>
					You can clear storage at any time in your browser&rsquo;s settings, or
					by removing the installed app. You will then be signed out and your
					settings will reset; your progress is safe on our servers. Deleting
					your account removes the game&rsquo;s storage from this device as
					well; see the <Doc to="/privacy">Privacy Policy</Doc>.
				</p>
			),
		},
		{
			id: "contact",
			title: "Changes and contact",
			body: (
				<p>
					We will update this page when what we store changes. Questions:{" "}
					{OPERATOR_NAME} · <Mail />
				</p>
			),
		},
	],
};
