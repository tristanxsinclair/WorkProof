# WorkProof

Mobile-first career evidence tool. Capture real experience, review source-linked statements, preview career uses and save a personal record. A worker can share one factual claim with a named verifier without sharing their history.

## Product boundaries

- Rule-based sentence extraction and conservative templates; no external model calls.
- The legacy stored state USER VERIFIED means worker review, not external verification. Visible proof states are Reported, Supported and Verified.
- Unprovided metrics read “Not provided”; unestablished outcomes read “Outcome not established”.
- Every non-missing claim links to original text, selected context, or an explicit clarification.
- Rejected and unreviewed statements are excluded from career translations. A capability needs a retained reviewed action; editing or rejecting that action excludes dependent capability claims.
- Save requires reviewed retained claims, reviewed context and an action, with matching factual source text. Missing evidence is permitted and shown.
- All four fictional examples remain separate from personal records.
- Opportunity Match is an explanatory placeholder only.

## Data

Cloudflare D1 stores records. Every read/write is scoped to the dispatcher-provided authenticated user ID. SQL uses bound parameters. Saves are idempotent by record UUID. Dates describe the experience; creation times are separate. Session storage holds only a temporary in-progress draft. No API credentials are required.

Source schema: db/schema.ts. Generated schema migrations: drizzle/. Runtime D1 queries are behind db/index.ts. No runtime schema creation or demo seeding.

`verification_requests` stores immutable selected-claim snapshots separately from worker-editable records. A SHA-256 fingerprint identifies the shared claim, sources, context, date, limitations and references. Responses record the signed-in verifier identity, self-described relationship, basis, timestamp and any correction. Only a matching confirmed version displays Verified. This hash is not a digital signature or independent authority check.

Requests require explicit worker consent and a recipient email; only that signed-in recipient can respond. Workers manually send links, which expire after 14 days and can be withdrawn. Corrections do not overwrite the worker's record or verify the original wording. No automatic emails, team permissions or employer analytics exist.

Worker-supplied reference descriptions/links are not uploaded or inspected material. The export in Profile and record detail includes original input, reviewed claims, references and verification history.

The current hosting access remains owner-only. External sign-in/access must be resolved before a real worker/manager pilot. Do not claim the new request link alone admits outside users.

## Career Pack and data-control upgrade

The Career Pack at `/career` replaces the placeholder in primary navigation.
It includes explicitly selected real experiences only, preserving source IDs,
evidence states, limitations and team credit. Capability summaries count distinct
reviewed experiences and do not rate workers. Search excludes rejected claims.

`DELETE /api/privacy` supports confirmed, authenticated deletion of one owned
record or all of the signed-in user's application data. Associated verification
requests are removed; responses given on another worker's records are erased
and invalidated without deleting that worker's evidence. Tests use isolated
databases and do not delete production data. Full native account deletion and
provider lifecycle work remain open.

`/privacy` discloses the implemented private-pilot data handling. It is not a
completed public-launch privacy policy. Native iOS signing, external identity,
device testing and App Store submission remain blocked/unverified. See
[the iPhone release gate](docs/ios-release-gate.md).

## Validation commands

- npm run install:ci — install locked dependencies.
- npx tsc --noEmit — type check.
- node --test tests/evidence.test.mjs — extraction and truth invariants.
- npm run build — production Worker build.
- node --test tests/api.test.mjs — isolated Worker API and persistence checks after building.
- npm test — production build plus all domain, Worker API and static component checks.
- npm run lint — lint (two pre-existing warnings in generated worker types).

Rule-based classification can miss nuance. Users must review the suggested categories and skills. Career text intentionally preserves supplied specifics and qualifiers. Voice capture, model-based rewriting and opportunity analysis are outside this first slice.

See [the repository audit and prioritised pilot plan](docs/pilot-audit.md) for baseline evidence, acceptance criteria, implementation scope, deferred work and readiness limits. Live browser/mobile checks were blocked by the browser URL policy; synthetic Worker tests are not production end-to-end evidence.
