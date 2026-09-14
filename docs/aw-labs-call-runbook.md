# WorkProof — AW Labs call runbook

Call: Wednesday, 16 September 2026, 2:00 PM AWST  
Objective: obtain a specific external product/engineering critique and determine whether AW Labs offers leverage beyond Tristan's current execution capability.

## Position

WorkProof is an existing private product, not an app idea seeking a generic build quote.

> WorkProof turns ordinary work experience into evidence-backed career claims. A worker records what happened in their own words, reviews every extracted statement, and can share one exact claim with a named verifier without exposing their full history. The product distinguishes what is Reported, Supported and externally Verified. The immediate goal is a small-business sales pilot—not an HR platform.

Do not mention other products. If asked what else has been built:

> I have built other software projects and internal systems, but WorkProof is the product I want to pressure-test today.

## 90-second demonstration

Use fictional data until the product flow is stable on the call device.

1. Open the homepage and point to **Capture → Report → Verify**.
2. Select **See a completed example**.
3. Open the retail-sales example: **Matching a television to a bright room**.
4. Show the original words beside the structured claims and source excerpts.
5. State the distinction: worker review produces **Reported**, not **Verified**.
6. Open one real saved record prepared before the call.
7. Show **Request verification** and its exact disclosure preview:
   - one selected factual claim;
   - source excerpt, context, date and limitations;
   - named recipient only;
   - full evidence history withheld.
8. End on the Career Pack or evidence export to show the portable outcome.

Do not spend the demonstration reviewing every generated statement. The point is the trust model and the end-to-end product, not every screen.

## Prepared real record

Before the call, create one short real record that contains:

- a clear situation;
- one personal action;
- an observed outcome;
- a number only if it can be supported;
- no customer name, order number, employer-confidential detail or invented metric.

Safe structure:

> A customer was comparing two products for a specific use. I asked about their requirements, explained the relevant differences and recommended the option that best matched those requirements. The customer chose that option. I cannot confirm whether my advice was the only reason for the purchase.

Use Tristan's own accurate wording and facts. Do not copy the template if it is not true.

## Readiness gate — complete before 1:30 PM AWST

- [ ] Product opens on the call phone and laptop.
- [ ] Signed-in session works on both devices.
- [ ] **See a completed example** opens the fictional Evidence Bank.
- [ ] One real record is saved and reopens after navigation.
- [ ] Request-verification disclosure preview loads for that record.
- [ ] No private customer or employer data appears anywhere on screen.
- [ ] Screen sharing is tested.
- [ ] A backup screen recording or screenshots cover the 90-second path.
- [ ] The product tab is open before the call; notifications are disabled.
- [ ] The NDA has been read; confidentiality is not assumed from the email alone.

If the real external recipient cannot access the verification link, say so directly:

> The in-product authorization and response path is implemented and tested synthetically. External hosting access and a genuine two-person browser round trip are the current release gate.

## Questions that test actual leverage

Ask after the demonstration, not before it.

1. What are the three largest production risks you see in this exact product?
2. How would you prove tenant isolation and permission boundaries before a business pilot?
3. What is the minimum real-user test you would run before adding pilot or employer infrastructure?
4. Would you ship this as a web product first or package it for iOS now, and what evidence drives that choice?
5. Which parts of the current architecture would you keep, replace or inspect before forming an opinion?
6. If AW Labs were engaged, what precise deliverables would you own, how would success be tested, and what would I retain?
7. What can AW Labs demonstrably execute faster or better than my current stack and development process?

## Evaluation rubric

| Signal | Strong evidence | Weak evidence |
| --- | --- | --- |
| Diagnosis | Identifies concrete risks after inspecting the actual flow | Gives a generic app-build pitch |
| Technical depth | Discusses auth boundaries, data isolation, release proof and failure modes specifically | Uses broad language about AI, apps or scalability |
| Commercial judgment | Recommends a bounded pilot and states what not to build | Proposes a large rebuild before customer evidence |
| Delivery | Names deliverables, acceptance tests, ownership, timeline and cost assumptions | Quotes a package without a verified scope |
| Integrity | Separates known facts from assumptions and asks for repository evidence | Claims certainty without inspecting implementation |

Do not decide on the call. Request a written scope if there is material leverage. Compare that scope against what can be done internally before spending money.

## Product truth for the call

Known from the repository:

- Worker-owned capture, claim review and career translation exist.
- Visible evidence states are Reported, Supported and Verified.
- A named verifier can receive one immutable selected-claim snapshot.
- Records are owner-scoped; SQL uses bound parameters.
- Privacy export and application-data deletion exist.
- The repository documents 64 passing automated tests at the last recorded audit.

Needs live verification:

- Current deployment matches the repository branch used for the demonstration.
- External users can sign in through the hosting access policy.
- A genuine worker → manager → worker browser round trip completes.
- Real mobile layout, accessibility and App Store readiness.
- Employer willingness to sponsor a pilot.

No claim should exceed the proof above.
