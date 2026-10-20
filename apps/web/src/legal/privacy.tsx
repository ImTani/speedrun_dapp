import { Doc, Ext, Mail } from "./bits.tsx";
import {
	GAME_NAME,
	LINKS,
	MIN_AGE,
	MIN_AGE_INDIA,
	OPERATOR_NAME,
} from "./config.ts";
import type { LegalDoc } from "./types.ts";

export const privacy: LegalDoc = {
	slug: "privacy",
	title: "Privacy Policy",
	description: `What ${GAME_NAME} collects, why, who it is shared with, how long it is kept and how to delete it.`,
	summary: [
		<>
			We keep only what the game needs: your sign-in id, your game addresses,
			your Fragment and your progress. No analytics, no ads, no tracking.
		</>,
		<>We never sell or share your personal information for advertising.</>,
		<>
			Moves, Marks and purchases are written to a public blockchain. Anyone can
			see them and nobody, including us, can delete them.
		</>,
		<>
			You can delete everything we hold off-chain from inside the game, at any
			time.
		</>,
	],
	sections: [
		{
			id: "who-we-are",
			title: "Who we are",
			body: (
				<>
					<p>
						{GAME_NAME} (&ldquo;the game&rdquo;) is run by {OPERATOR_NAME}{" "}
						(&ldquo;we&rdquo;, &ldquo;us&rdquo;). We decide how and why your
						personal data is used, which makes us the &ldquo;controller&rdquo;
						under European law and the &ldquo;data fiduciary&rdquo; under Indian
						law.
					</p>
					<p>
						Questions, requests and complaints about your data go to <Mail />.
						That address is also our grievance contact under India&rsquo;s
						Digital Personal Data Protection Act 2023.
					</p>
					<p>
						This policy covers the game&rsquo;s website and installable app.
						Privy (sign-in) and SmoothSend (transaction sponsorship) also have
						their own privacy policies for what they do; we link to them below.
					</p>
				</>
			),
		},
		{
			id: "what-we-collect",
			title: "What we collect",
			body: (
				<>
					<h3>When you sign in</h3>
					<p>
						You sign in with Privy, by a one-time code sent to your email or
						with your Google account. Privy holds your email address (and, for
						Google, the basic profile Google shares). Privy creates a wallet for
						you: a key that Privy keeps safe on your behalf. That key controls
						your game account on the Avalanche blockchain.
					</p>
					<p>Our own database does not store your email address. It stores:</p>
					<ul>
						<li>your Privy user id (a random identifier);</li>
						<li>
							the address of your Privy wallet and the address of your game
							account.
						</li>
					</ul>
					<h3>When you play</h3>
					<ul>
						<li>
							<strong>Your Fragment:</strong> its name, its Aspect and Sigils,
							and its status.
						</li>
						<li>
							<strong>Progress:</strong> Light, Ash, Resonance and Degree, a
							record of what you earned and spent, Spire floors and climbs,
							Scrying results, cosmetics you own and wear, Marks you have
							earned, and how far you are through the introduction.
						</li>
						<li>
							<strong>Purchases:</strong> which pack, the amount and the
							blockchain transaction reference.
						</li>
						<li>
							<strong>Notifications (only if you turn them on):</strong> the
							push address and keys your browser gives us, so we can tell you
							when a Gathering starts.
						</li>
					</ul>
					<h3>Technical data</h3>
					<p>
						Like any website, our hosting provider (Vercel) and Privy receive
						your IP address and basic browser and device details when your
						device connects. They use them to deliver the game and keep it
						secure, and keep them in short-lived logs. We do not copy them into
						our game database.
					</p>
					<h3>On your device</h3>
					<p>
						The game keeps a few things in your browser, such as your sign-in
						session and sound settings. The{" "}
						<Doc to="/cookies">Cookie Policy</Doc> lists every item.
					</p>
					<h3>What we do not collect</h3>
					<p>
						No analytics, advertising or tracking pixels. No location, contacts,
						photos or payment card details.
					</p>
				</>
			),
		},
		{
			id: "on-chain",
			title: "What goes on the blockchain",
			body: (
				<>
					<p>
						The game runs on Avalanche: the Fuji test network today, and the
						Avalanche C-Chain main network for the Conclave event. These records
						are written there:
					</p>
					<ul>
						<li>
							your game account address and your Fragment&rsquo;s address;
						</li>
						<li>every move your Fragment makes, and every result;</li>
						<li>the Marks (badges) you earn;</li>
						<li>your purchases.</li>
					</ul>
					<p>
						<strong>
							A blockchain is public and permanent. Anyone can read these
							records, and nobody, including us, can change or delete them.
						</strong>{" "}
						We do not publish your email next to your addresses, but anyone who
						learns that an address is yours can see its history.
					</p>
					<p>
						Your Fragment&rsquo;s name is not written to the blockchain. It is
						kept in our database and shown to other players in the game.
					</p>
				</>
			),
		},
		{
			id: "why",
			title: "Why we use it (our legal bases)",
			body: (
				<>
					<ul>
						<li>
							<strong>To run the game you signed up for</strong> (your account,
							playing your Fragment, progress, standings, cosmetics, Marks,
							purchases and sponsoring your transactions). Legal basis:
							performing our contract with you (the <Doc to="/terms">Terms</Doc>
							).
						</li>
						<li>
							<strong>To keep the game secure and fair</strong> (stopping
							cheating and abuse, protecting accounts, fixing faults). Legal
							basis: our legitimate interest in a safe, working game. You can
							object; see{" "}
							<Doc to="/privacy" section="your-rights">
								your rights
							</Doc>
							.
						</li>
						<li>
							<strong>To send you notifications</strong> when a Gathering
							starts. Legal basis: your consent, which you give by turning them
							on and can withdraw at any time in the game or in your browser
							settings.
						</li>
						<li>
							<strong>To meet legal duties</strong>, such as answering lawful
							requests. Legal basis: legal obligation.
						</li>
					</ul>
					<p>
						In India, we rely on your consent, given when you sign in after
						seeing this notice, and on the legitimate uses the DPDP Act allows.
						You can withdraw consent at any time by deleting your account.
					</p>
					<p>
						Our server plays your Fragment automatically, following the settings
						you choose. That is the game itself. We make no automated decisions
						about you that have legal or similarly significant effects.
					</p>
				</>
			),
		},
		{
			id: "sharing",
			title: "Who we share it with",
			body: (
				<>
					<p>
						We use these providers to run the game. Each only gets what it needs
						for its job and may not use it for anything else:
					</p>
					<ul>
						<li>
							<strong>Privy</strong> (United States): sign-in and your wallet.{" "}
							<Ext href={LINKS.privyPrivacy}>Privy&rsquo;s privacy policy</Ext>
						</li>
						<li>
							<strong>Vercel</strong> (United States, with servers worldwide):
							hosts the website and our server code.{" "}
							<Ext href={LINKS.vercelPrivacy}>
								Vercel&rsquo;s privacy notice
							</Ext>
						</li>
						<li>
							<strong>Neon</strong> (United States, US East region): our
							database.{" "}
							<Ext href={LINKS.neonPrivacy}>Neon&rsquo;s privacy notice</Ext>
						</li>
						<li>
							<strong>SmoothSend</strong>: pays the network fees for your game
							transactions and submits them, so it receives your game account
							address and each transaction.{" "}
							<Ext href={LINKS.smoothsendPrivacy}>
								SmoothSend&rsquo;s privacy policy
							</Ext>
						</li>
						<li>
							<strong>The Avalanche network</strong> and the services that read
							it: transactions are public by design (see{" "}
							<Doc to="/privacy" section="on-chain">
								what goes on the blockchain
							</Doc>
							).
						</li>
						<li>
							<strong>Your browser&rsquo;s push service</strong> (for example
							Google, Apple or Mozilla), only if you turn on notifications, to
							deliver them.
						</li>
					</ul>
					<p>
						Other players see your Fragment&rsquo;s name, its standing and
						results, and the Marks it carries.
					</p>
					<p>
						We may also disclose data if the law requires it, to protect people
						or the game from harm, or to a successor if the game changes hands
						(who would have to honour this policy).
					</p>
					<p>
						<strong>
							We do not sell your personal information, and we do not share it
							for cross-context behavioural advertising.
						</strong>
					</p>
				</>
			),
		},
		{
			id: "transfers",
			title: "International transfers",
			body: (
				<>
					<p>
						Our providers are mainly in the United States, so your data is
						processed there wherever you live. Where European or UK law applies,
						we rely on safeguards such as the European Commission&rsquo;s
						Standard Contractual Clauses or the EU-US Data Privacy Framework, as
						offered by each provider. Indian law allows these transfers except
						to countries the Government of India restricts; none of ours are
						restricted.
					</p>
					<p>
						Blockchain records are copied to computers all over the world by the
						nature of the network.
					</p>
				</>
			),
		},
		{
			id: "retention",
			title: "How long we keep it",
			body: (
				<>
					<ul>
						<li>
							<strong>Game data</strong> is kept while your account exists.
						</li>
						<li>
							<strong>When you delete your account</strong>, we remove it from
							our database at once, stop playing your Fragment and remove the
							game key we held for it. Copies in our database provider&rsquo;s
							short-term backups disappear as those roll over, normally within
							30 days.
						</li>
						<li>
							<strong>Notification details</strong> are removed when you turn
							notifications off, when your browser withdraws them, or when you
							delete your account.
						</li>
						<li>
							<strong>Technical logs</strong> at Vercel and Privy are kept for
							the short periods those providers set.
						</li>
						<li>
							<strong>Blockchain records</strong> are permanent and outside
							anyone&rsquo;s control.
						</li>
						<li>
							<strong>If the game closes</strong>, we will delete the off-chain
							data within 90 days.
						</li>
					</ul>
				</>
			),
		},
		{
			id: "your-rights",
			title: "Your rights",
			body: (
				<>
					<p>
						<strong>Delete your account in the game</strong>, or write to{" "}
						<Mail /> for anything else. We may ask you to write from the email
						you sign in with, so we know it is you. We answer within one month
						(45 days in California), and tell you if we need longer. Exercising
						your rights is free.
					</p>
					<h3>Everyone</h3>
					<ul>
						<li>Ask for a copy of your data, in a portable format.</li>
						<li>Ask us to correct it.</li>
						<li>
							Ask us to delete it. We delete everything we hold off-chain.{" "}
							<strong>We cannot delete blockchain records: no one can.</strong>
						</li>
						<li>
							Your sign-in account with Privy (your email and wallet) is
							separate, and deleting your game account does not remove it. Ask
							us and we will have Privy remove it, or contact Privy at{" "}
							<Mail to={LINKS.privySupport} />. While it exists, signing in
							again with the same email returns the same wallet and game
							account.
						</li>
					</ul>
					<h3>Europe and the UK (GDPR)</h3>
					<p>
						You also have the right to restrict how we use your data, to object
						to uses based on our legitimate interests, to withdraw consent at
						any time (without affecting what came before), and to complain to
						your data protection authority:{" "}
						<Ext href={LINKS.edpbAuthorities}>list of EU authorities</Ext>, or
						in the UK the <Ext href={LINKS.ukIco}>ICO</Ext>.
					</p>
					<h3>India (DPDP Act 2023)</h3>
					<p>
						You may ask for a summary of your data and how it is used, and who
						it was shared with; ask us to correct, complete, update or erase it;
						withdraw consent; and nominate someone to act for you if you die or
						cannot act. Raise any grievance with us first at <Mail />; we
						respond within 90 days at most. If you are not satisfied, you can
						complain to the Data Protection Board of India.
					</p>
					<h3>California and other US states</h3>
					<p>
						In the last 12 months we collected identifiers (your Privy user id,
						wallet and game addresses; Privy holds your email) and activity in
						the game, for the purposes above. We do not sell or share personal
						information, do not use sensitive personal information to infer
						things about you, and do not knowingly sell or share the data of
						anyone under 16. You have the right to know, to delete, to correct,
						and not to be treated differently for using these rights. You can
						use an authorised agent; we may check that they have your
						permission.
					</p>
				</>
			),
		},
		{
			id: "children",
			title: "Children",
			body: (
				<>
					<p>
						The game is not directed at children under 13. You must be at least{" "}
						{MIN_AGE} to play, and at least {MIN_AGE_INDIA} if you live in
						India.
					</p>
					<p>
						If we learn that someone younger is playing, we delete their
						off-chain data. If you think a child is playing, tell us at <Mail />
						.
					</p>
				</>
			),
		},
		{
			id: "security",
			title: "Security",
			body: (
				<>
					<p>
						Data travels encrypted (HTTPS). Access to our database and servers
						is limited to the people who run the game. We never see your wallet
						key: Privy holds it for you. The game key your Fragment plays with
						is kept on our game server and never shown to anyone.
					</p>
					<p>
						No system is perfectly secure. If a breach puts your data at risk,
						we will tell you and the authorities as the law requires.
					</p>
				</>
			),
		},
		{
			id: "changes",
			title: "Changes to this policy",
			body: (
				<p>
					We will update this page and its effective date when things change. If
					a change matters, we will also tell you in the game before it takes
					effect.
				</p>
			),
		},
		{
			id: "contact",
			title: "Contact",
			body: (
				<p>
					{OPERATOR_NAME} · <Mail />. For your Privy sign-in account, you can
					also contact Privy at <Mail to={LINKS.privySupport} />.
				</p>
			),
		},
	],
};
