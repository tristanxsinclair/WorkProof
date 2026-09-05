# WorkProof: small-business pilot audit and first slice

Audit date: 2 September 2026. Baseline source: commit `b862e11`.

## Subsequent mobile career-use upgrade — 2 September 2026

The original first-slice audit below is retained as history. A later upgrade adds
`/career` (explicitly selected Career Packs), reviewed-evidence search,
distinct-experience capability summaries, focused review, `/privacy` and
confirmed owner-scoped data erasure at `/api/privacy`. It does not add pilots,
invitations, employer analytics, a new auth provider or a native iOS build.

Current local result: **64/64 automated tests pass**, production Worker build
passes, typecheck passes, lint has zero errors and two existing generated-file
warnings. New deletion tests use isolated databases, not production data.
No schema changes or new dependency packages were required.

Web Share/download interaction, real iPhone layout, VoiceOver, native signing,
external-user access and the real worker-manager round trip remain unverified.
Site access remains owner-only. The in-app data erasure removes active application
data and invalidates erased verification contributions; it is not a claim of
native account-deletion compliance or deletion of the user's ChatGPT identity.
See [the iPhone release gate](ios-release-gate.md) for the native architecture
decision, Apple requirements, release blockers and exact acceptance checklist.

This is an experiment in employer sponsorship of worker-owned evidence, not an
HR platform. No retention, sales, productivity or performance benefit is proven.

## A. Repository truth before implementation

| Surface | Verified source | Actual behaviour |
| --- | --- | --- |
| Capture `/` | `app/page.tsx`, `app/workproof.tsx` | Signed-in text capture, context/date, per-claim review, career preview, save. |
| Evidence `/evidence` | `app/evidence/page.tsx`, `app/workproof.tsx` | Own records and separate fictional examples; skill/context filters. |
| Detail `/evidence/[id]` | `app/evidence/[id]/page.tsx`, `app/workproof.tsx` | Raw input, statements, source history, career views and draft-based edits. |
| Profile `/profile` | `app/profile/page.tsx` | Signed-in identity and explanation of storage/processing. |
| Opportunity `/opportunity` | `app/opportunity/page.tsx` | Explanatory placeholder; no matching, scraping or application system. |
| Records API | `app/api/experiences/route.ts` | Owner-scoped GET/POST, bound SQL, UUID upsert, origin/source/date checks. |
| Persistence | `db/schema.ts`, `drizzle/0000_living_microchip.sql` | One `experiences` table: `id`, `owner`, JSON `record`, `created_at`; owner index. |
| Domain model | `lib/evidence.ts` | Experience: title, raw text, context/date, claims, clarifications, demo flag, creation time. Claims: ID, category, text, quote, source, review state, rejection. |
| Extraction | `lib/evidence.ts` | Client-side regular-expression rules. No model request, model credentials or LLM service. |
| Career views | `lib/evidence.ts`, `app/workproof.tsx` | Sentence-based resume text, STAR sections, skills and interview prompts. Team wording retained; unknown outcomes flagged. |
| Authentication | `app/chatgpt-auth.ts`, route pages | Platform Sign in with ChatGPT. IDs, emails and optional names come from dispatcher headers. API authorization uses the signed-in user ID. |
| Temporary drafts | `app/workproof.tsx` | Account-keyed session storage, not the permanent evidence store. |
| Verification | `lib/evidence.ts` | `USER VERIFIED` means worker self-review. No other-person confirmation, immutable snapshots or requests. |
| Teams / proof / analytics | Schema, routes and application source inspected | No team, invitation, supporting-reference or event model; no analytics connector or employer view. |

Baseline verification actually run:

- `npm test`: build plus 23 passing tests (19 domain/API, four starter UI tests).
- `bash scripts/sites-env.sh -- node_modules/.bin/tsc --noEmit`: passed.
- `npm run lint`: one existing `react-hooks/set-state-in-effect` error in the
  client bootstrap and two warnings in generated `worker-configuration.d.ts`.
- Git worktree was clean. Existing dependencies and lockfile were retained.

Hosting evidence from the Sites service, separately from repository evidence:
the current site was owner-only (`custom`, one allowed account, no groups or
external visitors); external visitor invitations were disabled. A live URL is
not evidence that an external worker can enter it. This slice does not change
that access policy or send invitations.

## B. Product diagnosis

1. **Proof terminology:** self-review cannot be sold as manager verification.
2. **Extraction:** the supplied television example missed `bought` as an outcome
   and treated `65-inch` as a metric. Speculation and intentions could become
   actions; another person's explanation could supply a worker capability.
3. **Grounding:** a real quote could accompany different, invented factual text.
   Source matching alone was insufficient. A rejected action could leave behind
   an approved capability derived from it.
4. **Verification:** no selected disclosure, recipient restriction, immutable
   claim version, correction or withdrawal existed.
5. **Friction:** a long mobile review and a late save button obscure the useful
   transformation. The one-minute demonstration has not been timed with users.
6. **Participation:** external sign-in/site access must be proven before invites.
7. **Learning:** no pilot attribution, activation denominator, repeat-capture
   measurement, career-use feedback or manager continuation feedback exists.

### Keep

Vinext/React, the current icon and accessible control libraries, dispatcher
authentication, D1, individual ownership, source/correction history, reviewed
career views, context/skill filtering, explicit gaps and separate fictional
examples. No new provider, authentication stack or dependency was introduced.

### Modify

Extraction/grounding rules, visible review/proof labels, save validation,
account-scoped draft synchronization, review density and the save affordance.

### Add

A worker-added reference attached to a particular claim version; a single-claim
verification request and response; explicit sharing preview; private export.

## C. Pilot-critical plan

### P0: a useful, honest capture

- User problem: ordinary sales descriptions produce incorrect categories and
  too much scrolling before the transformation is apparent.
- Change: recognise purchases; isolate uncertainty/intention; tie capabilities
  to the worker's own action; distinguish product specifications from counts;
  show a compact structured overview and earlier save action.
- Why: the phone demonstration must show real experience becoming evidence.
- Files: `lib/evidence.ts`, `app/workproof.tsx`, `app/evidence-proof.tsx`,
  `app/use-capture-draft.ts`, `app/globals.css`.
- Acceptance: supplied TV outcome is retained, metric says Not provided, no
  speculative revenue, all eight requested scenarios create grounded records.
- Tests: scenario fixtures, truth-rule regressions, browser capture/review/save
  walkthrough at 375px and desktop, followed by a timed founder demonstration.
- Scope: rule improvements implemented; live mobile/timing proof remains open.

### P1: separate review, reference and external confirmation

- User problem: approving a generated statement appears to certify it.
- Change: visible Reported / Supported / Verified states; worker review is
  separate. Facts must equal a complete source unit or explicit clarification.
  Capabilities must have a retained reviewed action. Client-supplied verification
  metadata cannot be saved through the records API.
- Why: the product must preserve, not inflate, the underlying evidence.
- Files: `lib/evidence.ts`, `lib/verification.ts`, `lib/record-schema.ts`,
  `lib/http.ts`, records API, proof UI.
- Acceptance: every existing self-approval stays Reported; a worker reference
  only yields Supported; forged facts, cherry-picked negations and unsafe links
  are rejected; rejected actions do not support career capability claims.
- Tests: domain/API negatives, legacy examples and static component rendering.
- Scope: implemented without rewriting the meaning of legacy stored states.

### P2: one selected claim, one factual verification

- User problem: a manager cannot simply confirm a specific work event without
  receiving the worker's entire history.
- Change: worker selects a reviewed fact and named recipient; approves an exact
  preview; manually sends a link; recipient signs in, gives a knowledge basis
  and confirms, proposes corrected wording, or cannot verify.
- Why: this is the smallest end-to-end differentiator from generic rewriting.
- Files: `db/schema.ts`, `db/verification.ts`, appended Drizzle migration,
  `/api/verifications`, `/api/verifications/[id]`, `/verify/[id]`,
  `app/verification-panel.tsx`, `app/evidence-proof.tsx`.
- Acceptance: only owner and recipient can access the selected snapshot; no
  full raw history is shared; self-confirmation is refused; a response records
  account/name, relationship, basis, timestamp, correction and claim version;
  replay is idempotent; a changed version cannot inherit a confirmation.
- Tests: built-Worker D1 request/respond/reopen flow with separate test users;
  wrong-account, origin, expiry, withdrawal, replay, correction and stale-version
  tests. Real external-manager browser completion is still required.
- Scope: implemented. No team, employer record browser or auto-email system.

### P3: access and worker onboarding

- User problem: the current private site cannot admit pilot workers.
- Change: obtain an explicit owner decision on an available access arrangement,
  then prove an external person's platform sign-in. Add one short invite-entry
  explanation: personal ownership, selected sharing only, first recent capture.
- Why: a simulated account test is not an onboarding test.
- Systems: Sites access policy; current sign-in helpers; future invite-entry page.
- Acceptance: an actual invited worker can sign in, save and reopen a record;
  another worker and sponsor cannot list it.
- Tests: real two-person browser trial. Do not bypass the hosting access gate or
  add an unrelated authentication provider to conceal the blocker.
- Scope: deferred pending access decision and real participation test.

### P4: minimum pilot association

- User problem: the founder needs an invited cohort and denominator, not HR roles.
- Change: one pilot with business label, start/end, named verifier and a bounded
  list of invitees/accepted members. Manual founder operations are acceptable.
- Why: attribute a 21-day trial while personal records remain worker-owned.
- Files/systems: future `pilots`, `pilot_invites`, `pilot_members` schema and
  acceptance endpoint. Do not reuse site sharing as employer data permissions.
- Acceptance: 5-10 workers can join one pilot, leave it, and retain their records;
  membership grants no record-reading capability.
- Tests: invitation acceptance/replay/expiry and cross-account isolation.
- Scope: not implemented in the first slice.

### P5: minimum measurement

- User problem: usage and value hypotheses are not currently measurable.
- Change: idempotent server events for invite accepted, first genuine save,
  subsequent save on another day, request created and response completed;
  an explicit worker career-use report and manager continuation/payment question.
- Why: distinguish observed behaviour from a copy-button click or favourable copy.
- Systems: minimal event schema; record/invite/request write boundaries; a
  founder-only aggregate export, not a manager employee dashboard.
- Acceptance: invitations provide a denominator; updates/retries/demo records do
  not inflate capture; responses and confirmations are separate counts; report
  capabilities supported by multiple distinct retained experiences; no raw
  experience content in events or per-worker rankings.
- Tests: deduplication, cohort/time-window aggregation, two-day capture, privacy
  checks and manual reconciliation against consented pilot totals.
- Scope: not implemented. Existing durable timestamps and responses can support
  later aggregates, but are not a complete pilot analytics system.

### P6: portable, useful career evidence

- User problem: sentence concatenation is verbose; repeated capability evidence
  is not yet visible; ownership needs practical portability.
- Change: export raw input, claims, references and scoped verification history
  now. Later tighten translations and link capability summaries to distinct
  experiences, with verified facts clearly distinguished from interpretations.
- Why: accumulate a reusable record, not merely better-sounding text.
- Files: `app/evidence-proof.tsx`, Profile/detail, `lib/evidence.ts`; future Bank
  capability summary. Preserve team credit and all outcome qualifications.
- Acceptance: export remains complete and readable as JSON; career statements
  reference retained evidence; no invented metrics or causal claims; accumulation
  counts distinct experiences rather than duplicate claims in one record.
- Tests: domain and component tests now; browser download/reopen and worker
  utility interviews before claiming practical portability or usefulness.
- Scope: export implemented; richer translation/accumulation deferred.

## D. Explicit defer list

No payroll/HRIS, employer analytics, employee rankings, productivity scores,
generic endorsements, enterprise SSO/RBAC, organisation hierarchies, billing,
LMS, recruiter views, job boards, scraping, applications, social/gamification,
automatic reminders, bulk emails, voice or model-provider integration.

File uploads/R2, cryptographic third-party certificates, a full verifier registry
and automated identity/authority checking are also outside this first slice.
References are pointers/descriptions, not uploaded or independently inspected
material. A source hash identifies a version; it is not a digital signature.

## E. First implemented vertical slice

1. Worker captures and reviews a real event in their individual account.
2. Record remains Reported; an optional worker-added material reference is
   clearly labelled Supported, not independently checked.
3. Worker selects one factual claim, chooses the recipient's sign-in email,
   previews every disclosed field and explicitly consents.
4. WorkProof persists an immutable, SHA-256-versioned snapshot and produces a
   link. It sends no email. A prepared email can be opened by the worker.
5. Only the named, signed-in recipient can respond. They state relationship and
   direct-observation/material-review basis. Their role is self-described.
6. Exact confirmation appears only on the unchanged claim version. Corrections
   return to the worker and do not silently mutate or certify the original.
7. Worker can withdraw recipient access. A pending request expires in 14 days.
   The worker keeps its history; withdrawal cannot retract recipient copies.
8. Worker can export their own records and verification history.

The appended migration only adds `verification_requests` and an owner/time
index. The original table and applied migration remain intact. Verification
metadata comes from a separate server-owned table, not the editable record JSON.

## Readiness and experiment gates

Final local verification for this slice:

| Check | Result |
| --- | --- |
| `npm test` | PASS: production Worker build and 50 tests (30 domain, 13 API, seven component tests). |
| TypeScript `tsc --noEmit` | PASS. |
| `npm run lint` | PASS with zero errors; two pre-existing warnings in generated worker types. |
| `git diff --check` | PASS. |
| Schema migration | Inspected: one new table/index; original migration unchanged; applied by API test fixtures. |
| Actual mobile/browser flow | BLOCKED by browser URL policy, not passed. |
| Production worker/manager trial | NOT RUN; site access remains owner-only. |

- Automated API tests use synthetic dispatcher identities in isolated local
  Workers. They do not test the production identity dispatcher or real people.
- The cloud browser could not open the supervised preview because its URL was
  blocked by the browser policy. No alternative browser or policy bypass was
  used. Actual mobile rendering, click-through, export download and one-minute
  timing therefore remain UNVERIFIED.
- Real invitation delivery, external sign-in, manager completion and pilot
  counts remain UNVERIFIED. Production publication is not pilot readiness.
- The rule engine remains intentionally bounded. Unsupported or unfamiliar
  descriptions can need manual clarification; worker honesty and verifier
  reliability are not algorithmically established.
- A correction requires worker review and a fresh request for the revised claim.
  This adds a step but avoids certifying unaccepted or ambiguous wording.
- New validation can require re-review of older records whose capability
  source was edited/rejected or whose previous classification was incorrect.

Before three businesses: run one real worker/manager pair through mobile
capture, correction, save, request, response, refresh and export. Confirm who can
see every field. Then add cohort attribution and the narrow measurement slice.

Founder experiment thresholds remain targets, not results: three businesses,
15+ workers, 50+ genuine experiences, 10+ completed verification responses,
meaningful repeat capture and two managers independently asking to continue.
Define repeat behaviour and the feedback question before enrolment; distinguish
responses from confirmations, reported capabilities from verified facts, and
stated willingness to pay from an actual payment. No product-market-fit claim.
