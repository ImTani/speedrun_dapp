// Operator details for the Terms, Privacy Policy and Cookie Policy. Every legal page and component
// reads these; fill them in here and nowhere else. A value still in [square brackets] is a
// placeholder: development builds warn about it (see unfilledLegalFields); production never blocks.

/** The person or company that runs the game and is responsible for players' data. */
export const OPERATOR_NAME = "Tani";
/** Where players send questions, data requests and grievances. */
export const CONTACT_EMAIL = "hey@imtani.dev";
/** Governing law and courts, e.g. "the laws of India; the courts of Bengaluru". */
export const JURISDICTION = "the laws of India; the courts of competent jurisdiction in India";
/** ISO date the current documents took effect. Bump it whenever a document changes materially. */
export const EFFECTIVE_DATE = "2026-10-20";
/** Youngest age allowed to play. The game is not directed at children under 13 in any case. */
export const MIN_AGE = 16;
/**
 * Youngest age allowed for players in India. The DPDP Act 2023 treats everyone under 18 as a child
 * whose data needs verifiable parental consent, which the game does not collect; so 18 there.
 */
export const MIN_AGE_INDIA = 18;

/** The game's name as it appears in the documents. */
export const GAME_NAME = "Apostasy: Sede Vacante";

/** localStorage key remembering that the storage notice was dismissed (listed in the Cookie Policy). */
export const NOTICE_KEY = "apostasy.legal.notice";

/** Third-party policies the documents link to. */
export const LINKS = {
	privyPrivacy: "https://www.privy.io/privacy-policy",
	privyTerms: "https://www.privy.io/user-terms-of-service",
	privyHelp: "https://www.privy.io/user-help-center",
	privySupport: "support@privy.io",
	vercelPrivacy: "https://vercel.com/legal/privacy-policy",
	neonPrivacy: "https://neon.com/privacy-policy",
	smoothsendPrivacy: "https://smoothsend.xyz/privacy",
	edpbAuthorities:
		"https://www.edpb.europa.eu/about-edpb/about-edpb/members_en",
	ukIco: "https://ico.org.uk/make-a-complaint/",
} as const;

/** EFFECTIVE_DATE written out for readers, e.g. "20 October 2026". */
export function effectiveDateLabel(): string {
	const d = new Date(`${EFFECTIVE_DATE}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return EFFECTIVE_DATE;
	return d.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

const isPlaceholder = (v: string) => /^\[.*\]$/.test(v.trim());

/** Names of the fields above that still hold a [placeholder]. Empty when all are filled. */
export function unfilledLegalFields(): string[] {
	const fields: Record<string, string> = {
		OPERATOR_NAME,
		CONTACT_EMAIL,
		JURISDICTION,
		EFFECTIVE_DATE,
	};
	return Object.entries(fields)
		.filter(([, v]) => isPlaceholder(v))
		.map(([k]) => k);
}

let warned = false;
/** Development only: one console warning naming any unfilled placeholder. Never throws. */
export function warnUnfilledLegalFields(): void {
	if (process.env.NODE_ENV === "production" || warned) return;
	const missing = unfilledLegalFields();
	if (!missing.length) return;
	warned = true;
	console.warn(
		`[legal] placeholders still unfilled in src/legal/config.ts: ${missing.join(", ")}`,
	);
}

/** True in development builds while any placeholder is unfilled (drives the draft banner). */
export const showDraftBanner = (): boolean =>
	process.env.NODE_ENV !== "production" && unfilledLegalFields().length > 0;
