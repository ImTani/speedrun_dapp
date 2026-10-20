# Legal

Terms of Service, Privacy Policy and Cookie Policy for Apostasy: Sede Vacante, plus the storage
notice, legal links and in-app account deletion.

**Not legal advice.** These documents are drafts written for a hackathon product. Have a qualified
lawyer review them before any commercial launch, real-money sales, or marketing to a new region.

- `config.ts`: operator name, contact, jurisdiction, effective date, ages. Fill placeholders here
  only; development builds warn (console + a banner on the legal pages) while any remain.
- `terms.tsx`, `privacy.tsx`, `cookies.tsx`: the documents. Keep them true to the code: the table
  list in `src/server/account.ts`, the storage list in `cookies.tsx`, the providers in `privacy.tsx`.
- Bump `EFFECTIVE_DATE` whenever a document changes materially, and tell players in the game.
