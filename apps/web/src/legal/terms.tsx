import { Doc, Ext, Mail } from "./bits.tsx";
import {
	GAME_NAME,
	JURISDICTION,
	LINKS,
	MIN_AGE,
	MIN_AGE_INDIA,
	OPERATOR_NAME,
} from "./config.ts";
import type { LegalDoc } from "./types.ts";

export const terms: LegalDoc = {
	slug: "terms",
	title: "Terms of Service",
	description: `The rules for playing ${GAME_NAME}: your account, autonomous play, virtual items, purchases and fair play.`,
	summary: [
		<>
			You must be at least {MIN_AGE} ({MIN_AGE_INDIA} in India). The game is
			free, and we pay the network fees.
		</>,
		<>
			Light, Ash, Resonance, cosmetics and Marks have no money value and cannot
			be sold, traded or cashed out.
		</>,
		<>
			Scrying uses earned Ash only, never money. Vestry packs are fixed (no
			chance) and are paid with test tokens that have no value.
		</>,
		<>
			Play fair, keep names decent. This is an early hackathon game: things may
			change, reset or stop.
		</>,
	],
	sections: [
		{
			id: "agreement",
			title: "These terms",
			body: (
				<>
					<p>
						These terms are an agreement between you and {OPERATOR_NAME}{" "}
						(&ldquo;we&rdquo;, &ldquo;us&rdquo;), who run {GAME_NAME}{" "}
						(&ldquo;the game&rdquo;). By signing in or playing, you accept them.
						If you do not accept them, please do not play.
					</p>
					<p>
						The <Doc to="/privacy">Privacy Policy</Doc> and{" "}
						<Doc to="/cookies">Cookie Policy</Doc> explain how we handle your
						data. Nothing in these terms takes away rights you have by law as a
						consumer.
					</p>
				</>
			),
		},
		{
			id: "early-game",
			title: "An early, experimental game",
			body: (
				<p>
					The game was built for the Team1 India Speedrun on Avalanche hackathon
					and is in beta. Rules, balance and features will change. Progress on
					the test network may be reset. We may pause or end the game at any
					time, and will try to give notice in the game first.
				</p>
			),
		},
		{
			id: "eligibility",
			title: "Who can play",
			body: (
				<>
					<p>To play, you must:</p>
					<ul>
						<li>
							be at least {MIN_AGE} years old, or at least {MIN_AGE_INDIA} if
							you live in India;
						</li>
						<li>be able to agree to these terms where you live;</li>
						<li>
							not be barred from using the game by sanctions or other laws;
						</li>
						<li>use one account, for yourself.</li>
					</ul>
				</>
			),
		},
		{
			id: "account",
			title: "Your account and wallet",
			body: (
				<>
					<p>
						You sign in through Privy, by email code or Google. Privy then
						creates a wallet for you: a key Privy holds on your behalf, which
						controls your game account on the Avalanche blockchain. We never see
						or hold that key. Privy&rsquo;s{" "}
						<Ext href={LINKS.privyTerms}>terms of service</Ext> and{" "}
						<Ext href={LINKS.privyPrivacy}>privacy policy</Ext> apply to
						Privy&rsquo;s part.
					</p>
					<p>
						Keep access to your email secure: whoever can sign in as you can
						play as you. Tell us at <Mail /> if you think someone else has
						access.
					</p>
					<p>
						You never pay network fees: SmoothSend pays them for the
						game&rsquo;s own transactions. We may limit or stop that sponsorship
						to prevent abuse.
					</p>
					<p>
						<strong>
							Your game account is not a general-purpose wallet. Do not send
							money or tokens to it from elsewhere.
						</strong>{" "}
						We cannot recover or return anything sent to it.
					</p>
				</>
			),
		},
		{
			id: "autonomous-play",
			title: "How your Fragment plays",
			body: (
				<>
					<p>
						You choose your Fragment&rsquo;s name, Aspect and Sigils. Our server
						holds your Fragment&rsquo;s game key and plays every move for it
						automatically, following those settings. You do not control
						individual moves.
					</p>
					<p>
						Results depend on the other Fragments, on timing and on chance. We
						do not promise that your Fragment enters every Gathering, or that
						every move lands: networks get busy and servers fail. Missed or lost
						moves are part of the game and are not compensated.
					</p>
				</>
			),
		},
		{
			id: "virtual-items",
			title: "Virtual items have no money value",
			body: (
				<>
					<p>
						Light, Ash and Resonance are earned by playing. They, the cosmetics
						and the Marks:
					</p>
					<ul>
						<li>have no monetary value and are not your property;</li>
						<li>
							cannot be bought, sold, traded, transferred, withdrawn or
							exchanged for money or anything else;
						</li>
						<li>
							give you a personal licence to use them in the game, which ends
							when your account ends.
						</li>
					</ul>
					<p>
						We may adjust balances and items to fix mistakes, undo cheating or
						rebalance the game. Cosmetics only change how your Fragment looks,
						never how it plays. Marks are badges recorded on the blockchain that
						cannot be transferred (&ldquo;soulbound&rdquo;); they are records of
						play, not investments.
					</p>
				</>
			),
		},
		{
			id: "scrying",
			title: "Scrying is not gambling",
			body: (
				<p>
					Scrying in the Reliquary draws a random cosmetic. It costs only Ash
					you earned by playing; it can never be paid for with money, and Ash
					cannot be bought. Nothing of money value is staked or won, and the
					cosmetics drawn cannot be sold. The chances of each result are shown
					in the game.
				</p>
			),
		},
		{
			id: "purchases",
			title: "Vestry purchases",
			body: (
				<>
					<p>
						The Vestry sells packs of cosmetics. Each pack&rsquo;s contents are
						fixed and shown before you buy: there is no chance involved.
					</p>
					<p>
						<strong>
							For now, packs are paid with test USDC on Avalanche&rsquo;s Fuji
							test network. Test tokens have no real value
						</strong>{" "}
						and cannot be exchanged for money.
					</p>
					<p>
						If we later sell packs for a real stablecoin, we will update these
						terms first and show the full price before you pay. Purchases are
						final and not refundable, except where the law requires a refund.
						Where you have a legal right to cancel a digital purchase, you will
						be asked to agree that the pack is delivered at once, and you accept
						that this ends that right once it is delivered.
					</p>
				</>
			),
		},
		{
			id: "names",
			title: "Names and what you write",
			body: (
				<>
					<p>
						Other players see your Fragment&rsquo;s name. It must not be
						hateful, harassing, sexual, violent, impersonating, misleading,
						infringing or advertising, and must not contain anyone&rsquo;s
						personal details, including your own.
					</p>
					<p>
						You give us permission to show your Fragment&rsquo;s name in the
						game for as long as it exists. We may change or remove a name that
						breaks these rules.
					</p>
				</>
			),
		},
		{
			id: "fair-play",
			title: "Fair play",
			body: (
				<>
					<p>You must not:</p>
					<ul>
						<li>cheat, or use more than one account to gain an advantage;</li>
						<li>
							use bots, scripts or other automation to play, apart from the
							game&rsquo;s own Fragments;
						</li>
						<li>
							exploit bugs. Report them to <Mail /> instead;
						</li>
						<li>
							interfere with the game, its servers, its smart contracts or the
							fee sponsorship, or try to get around limits we set;
						</li>
						<li>harass other players, including through names;</li>
						<li>use the game for anything unlawful.</li>
					</ul>
					<p>
						Reading the public smart contracts and blockchain records is fine.
					</p>
				</>
			),
		},
		{
			id: "blockchain",
			title: "Blockchain risks",
			body: (
				<>
					<p>
						Moves, results, Marks and purchases are recorded on the Avalanche
						blockchain (the Fuji test network, and the main network for the
						Conclave). Please understand that:
					</p>
					<ul>
						<li>
							these records are public and permanent: no one can delete them;
						</li>
						<li>transactions cannot be reversed once confirmed;</li>
						<li>
							we do not control Avalanche. Networks can slow down, halt, change
							or be reset, and test networks especially;
						</li>
						<li>smart contracts can contain bugs despite our care;</li>
						<li>laws about blockchains are still developing and may change.</li>
					</ul>
				</>
			),
		},
		{
			id: "our-content",
			title: "Our content",
			body: (
				<p>
					The game, its art, text and code belong to us or our licensors. You
					may use the game for your own personal, non-commercial play. Parts of
					it are open source or licensed from others (such as its fonts), under
					their own licences.
				</p>
			),
		},
		{
			id: "as-is",
			title: "The game is provided as is",
			body: (
				<p>
					We work to keep the game running well, but we provide it &ldquo;as
					is&rdquo; and &ldquo;as available&rdquo;. To the extent the law
					allows, we make no promises that it will be uninterrupted, error-free
					or fit for any particular purpose, or that progress or items will be
					kept.
				</p>
			),
		},
		{
			id: "liability",
			title: "Limits on our liability",
			body: (
				<>
					<p>
						To the extent the law allows, we are not liable for indirect or
						unforeseeable losses, lost progress or items, or problems caused by
						Privy, SmoothSend, the Avalanche network or other services we do not
						control. Our total liability to you for any claim is limited to the
						greater of what you paid us in the 12 months before the claim and 50
						US dollars.
					</p>
					<p>
						Nothing here limits liability for death or personal injury caused by
						negligence, for fraud, or for anything else that cannot be limited
						by law, and it does not affect your statutory consumer rights.
					</p>
				</>
			),
		},
		{
			id: "ending",
			title: "Ending your account",
			body: (
				<>
					<p>
						You can stop playing at any time and delete your account in the
						game. We may suspend or close an account that breaks these terms,
						puts other players or the game at risk, or where the law requires.
						Where we reasonably can, we will tell you why.
					</p>
					<p>
						When an account ends, the data we hold off-chain is deleted as the{" "}
						<Doc to="/privacy" section="retention">
							Privacy Policy
						</Doc>{" "}
						describes. Blockchain records remain. The sections on virtual items,
						blockchain risks, liability and disputes continue to apply.
					</p>
				</>
			),
		},
		{
			id: "law",
			title: "Governing law and disputes",
			body: (
				<>
					<p>
						If something goes wrong, write to us at <Mail /> first; we will try
						to resolve it within 30 days.
					</p>
					<p>
						These terms are governed by {JURISDICTION}, and disputes go to those
						courts. If you are a consumer, you also keep the protection of the
						mandatory laws of the country you live in, and may bring a claim in
						your local courts where that law allows.
					</p>
				</>
			),
		},
		{
			id: "changes",
			title: "Changes to these terms",
			body: (
				<p>
					We may update these terms as the game changes. We will change the
					effective date and, for important changes, tell you in the game before
					they apply. If you keep playing after that, the new terms apply; if
					you do not agree, you can stop playing and delete your account.
				</p>
			),
		},
		{
			id: "general",
			title: "General",
			body: (
				<p>
					These terms, with the policies they link to, are the whole agreement
					about the game. If part of them cannot be enforced, the rest still
					applies. If we do not enforce a term straight away, we can still do so
					later. We may transfer this agreement to someone who takes over the
					game; you may not transfer it.
				</p>
			),
		},
		{
			id: "contact",
			title: "Contact",
			body: (
				<p>
					{OPERATOR_NAME} · <Mail />
				</p>
			),
		},
	],
};
