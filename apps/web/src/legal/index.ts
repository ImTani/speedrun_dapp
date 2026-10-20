// Public surface of the legal module. Pages live in app/terms, app/privacy, app/cookies.

export { CookieNotice, type CookieNoticeProps } from "./CookieNotice.tsx";
export * from "./config.ts";
export { DeleteAccount, type DeleteAccountProps } from "./DeleteAccount.tsx";
export { type DeleteAccountResult, deleteAccount } from "./deleteAccount.ts";
export { LegalLinks, type LegalLinksProps } from "./LegalLinks.tsx";
