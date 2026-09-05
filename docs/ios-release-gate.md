# WorkProof — iPhone release gate

Prepared 2 September 2026. This is a release plan, not an App Store approval claim.

## Decision

Ship the improved private web product now. Do not submit it as a remote-website
wrapper. A native build, accessible authentication, public-release privacy work
and real-device acceptance are still required. No Apple account was accessed,
membership bought, identifier registered or binary uploaded in this pass.

## What this upgrade adds

- Career Pack: select up to 12 real, reviewed experiences; preview exact outgoing
  text; share/copy/download career wording, STAR preparation and source statements.
- Capability summaries: counts refer to distinct experiences, with separately
  labelled confirmed source actions. A confirmed action is not a verified skill.
- Search across titles, dates, contexts and reviewed statements. Rejected content
  and unrelated raw notes do not become search results.
- Focused review: remaining decisions appear first; reviewed, excluded and
  missing statements remain available in a disclosure.
- Owner-scoped record deletion and full application-data erasure. Erasing a
  verifier's contribution invalidates the confirmation without deleting the other
  worker's experience. These are data controls, not certified account-deletion compliance.
- A data-handling disclosure, explicit sign-out link, offline warning and mobile
  input/spacing improvements. No service worker, offline application or cloud
  draft backup is claimed.

No new provider, billing, employee monitoring, analytics or team infrastructure.
No schema migration; deletion uses atomic, parameter-bound D1 batches.

## Readiness matrix

| Gate | State | Evidence / next action |
| --- | --- | --- |
| Evidence truth and account-isolation tests | 64 automated tests pass | Production build, typecheck and lint pass; lint has two pre-existing generated-file warnings. These are not browser/device tests. |
| Useful personal workflow | Implemented in web source | Capture → review → save → find → select → export. |
| iPhone interaction / accessibility | Not tested on-device | Test small-screen layout, keyboard, text enlargement, VoiceOver, sharing and deletion. |
| External worker and verifier access | Blocked | Current Sites policy is owner-only; external invitations are disabled. An access change requires an owner decision. |
| Native project / signed archive | Not built | This environment is Linux with no xcodebuild. No iOS workspace or IPA is being passed off as a tested deliverable. |
| Public-release privacy/support | Incomplete | Confirm operator/contact, provider retention/backups, privacy declarations and a public policy/support URL. Current disclosure is private-pilot information only. |
| Full account deletion | Needs native identity design | App data can be erased. ChatGPT identity remains separately managed; no provider token revocation or native account lifecycle is implemented. |
| TestFlight | Not run | Requires native build, signing and App Store Connect access. |
| App Store submission / approval | Not ready | Do not equate a private web deployment or green tests with approval. |

## Recommended native route

Recommendation, not an implemented migration: retain the domain rules and tests,
then build a locally bundled React client with Capacitor for iOS. Keep the server
API separate. The current Vinext server-rendered build is not a static app bundle
that can be copied directly into a native web directory.

Capacitor supports a native iOS runtime and Xcode workflow. Its `server.url`
option is documented for development live reload, not production. Build local
assets instead of pointing an app shell at the current private website.
[Capacitor iOS](https://capacitorjs.com/docs/ios) ·
[Configuration](https://capacitorjs.com/docs/config)

Native value should be practical: secure on-device unfinished drafts, a reliable
reconnect/save path, native share/files integration and verification deep links.
Do not add unnecessary permissions or features merely to look native. These
capabilities are proposed, not delivered in this web upgrade.

## Authentication decision must precede native coding

The current server trusts identity headers supplied by the Sites dispatcher.
Never reproduce those headers in a mobile client, embed a Sites bypass token, or
accept an email address as authentication. A mobile app needs a supported,
server-validated session with tested account ownership and revocation.

First establish a supported public/native identity path with the owner. Adding
another identity provider or moving the backend is a separate architecture and
access decision. Preserve existing records and identity mappings during any
migration. A verification invitation must target the recipient's actual sign-in
identity, including private relay addresses where applicable.

## Submission sequence

1. **Prove one real pair.** A worker saves real evidence, shares one claim, a
   different verifier responds, and the worker reopens the exact confirmation.
   Do this on phones; synthetic identities are not a substitute.
2. **Resolve distribution and identity.** Approve an external-user access model
   and native sign-in/account lifecycle. Do not silently make the site public.
3. **Create the native client on a Mac.** Bundle local assets, implement the
   native utility above, configure signing, and run a device build. Apple currently
   requires Xcode 26+ with the iOS 26 SDK for uploads, effective 28 April 2026.
   [SDK requirements](https://developer.apple.com/news/upcoming-requirements/)
4. **Finish release obligations.** Apple expects adequate app functionality,
   complete review access and metadata. Review login-service requirements for
   the chosen identity design. A repackaged website is a rejection risk.
   [Review guidelines](https://developer.apple.com/app-store/review/guidelines/)
5. **Complete privacy and deletion.** Supply a publicly accessible policy and
   accurate data disclosures. Where account creation is supported, provide
   in-app account deletion, including applicable identity-token revocation.
   [Privacy details](https://developer.apple.com/app-store/app-privacy-details/) ·
   [Account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
6. **TestFlight before release.** Upload the signed build through App Store
   Connect, test the acceptance cases below, fix failures, then submit the exact
   tested build with real app screenshots and review instructions.
   [TestFlight](https://developer.apple.com/testflight/) ·
   [App Review](https://developer.apple.com/distribute/app-review/)

Apple Developer Program membership is USD 99 per year, with local pricing shown
during enrolment. Verify the Australian checkout amount; no AUD conversion is
assumed. [Enrolment](https://developer.apple.com/programs/enroll/)

## Device acceptance receipt to collect

- iPhone model, iOS version, native build number and tester identity/role.
- Start signed out; complete sign-in; cancel and retry sign-in safely.
- Capture with the keyboard open; correct/reject a claim; finish the review.
- Confirm missing metrics/outcomes and team credit remain honest.
- Save, relaunch and reopen; verify retries do not duplicate the record.
- Search and select only intended records; inspect every exported statement.
- Share, cancel sharing, download and reopen the export from Files.
- Interrupt the network mid-save; retry; reconcile the final saved record.
- Submit one claim; test correct recipient and wrong-account denial.
- Change a verified claim; confirm its old verification no longer applies.
- Delete one disposable record; ensure its request links become unavailable.
- Erase a disposable test account's data; test a separate account is untouched.
- Test VoiceOver labels, focus after review actions, large text, landscape and
  small screens; no clipped controls, hidden primary actions or horizontal scroll.

Do not run destructive acceptance cases on the founder's real evidence.
No release gate is passed until its actual result is recorded.
