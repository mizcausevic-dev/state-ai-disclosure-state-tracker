# state-ai-disclosure-state-tracker

> **State AI Disclosure State Tracker v0.1 draft.** Hash-chained, append-only per-state lifecycle record schema + reference verifier for EdTech AI products navigating the **50 state student-data-privacy + state-AI-policy regimes**. Names per-state statutes (Illinois SOPPA, California AB 1584 + AB 2876, Texas HB 18 / SCOPE, NY ED Law 2-d, Virginia ChAIPA, Colorado SB 196, and dozens more), the field requirements each statute adds beyond the FERPA + COPPA federal floor, the product's per-state disclosure status, and the lifecycle transitions when a state passes a new statute or refreshes an existing one. Bridges the heterogeneous state-policy landscape to the Kinetic Gain Protocol Suite audit-stream spine.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com).

> Status: v0.1 draft. Schema at [`schema/state-ai-disclosure-record.schema.json`](./schema/state-ai-disclosure-record.schema.json), one worked example at [`examples/`](./examples/), reference verifier in [`src/verify.mjs`](./src/verify.mjs).

## Why this exists

There is no FDA for EdTech. There are 50 of them.

When an EdTech AI vendor deploys across multiple states, the federal floor (FERPA + COPPA + IDEA + Section 504) gets supplemented by **state-specific student-data-privacy + state-AI-policy statutes** that each name additional disclosure obligations, additional vendor-attestation requirements, additional bias-coverage requirements, and additional parental-rights augmentations. A non-exhaustive list (as of 2026):

- **Illinois SOPPA** (105 ILCS 85/) — vendor contract clauses, no-sale-or-targeted-ad, breach notification, deletion rights, annual attestation.
- **California AB 1584** (Cal. Ed. Code §49073.1) + **AB 2876** (2024) — adds AI-specific disclosure, bias disclosure, training-data summary, risk-tier, and facial-recognition restriction.
- **Texas HB 18 (SCOPE)** + **TX Ed. Code Ch. 32** — parental control mechanism, social-media-companion treatment, biometric + precise-geolocation restriction.
- **NY ED Law 2-d** + **Part 121 regs** — Parent Bill of Rights, vendor data-protection plan, state ED-style contract clauses.
- **Virginia ChAIPA** (2024) — AI in education-decisions disclosure.
- **Colorado SB 196 / AI Act** (2025 effective) — high-risk AI in education subject to special obligations.
- **Connecticut SB 1103** (2023) — student data privacy + AI-specific addendum.
- **Maryland HB 1255** (2023) — student data privacy.
- ...and 40+ more, with new ones passing each legislative session.

A vendor responsibly deploying multistate needs to track:

1. **Which states is the product currently in?**
2. **Which statute(s) apply in each state — and what version of each statute** (statutes refresh regularly)?
3. **What is the product's per-state disclosure status** — not yet submitted, under review, published, published with conditions, non-conformant + remediation pending, withdrawn?
4. **What evidence has been provided per statute** — addendum executed, AI disclosure published, bias-coverage bundle referenced, no-sale attestation filed, etc.?
5. **When is the next annual attestation due in each state?**

Today vendors track this in spreadsheets that go stale within a quarter. This repo defines the canonical record that captures it as one append-only, hash-chained, signable document.

## What's in the record

| Field | Required | Purpose |
| --- | :---: | --- |
| `record_version` | ✓ | Schema version (`0.1`) |
| `record_id` | ✓ | Stable record identifier |
| `product` | ✓ | Name, version, vendor, intended use, audience grade band, under-13 flag |
| `states_in_scope[]` | ✓ | Two-letter state codes the product is deployed in (or planned within 12 months) |
| `per_state_status[]` | ✓ | One entry per state: statute citation, current status, statute-specific fields documented, annual attestation timing |
| `transitions[]` | ✓ | Append-only per-state state-machine history with triggers |
| `federal_floor_compliance` | recommended | URIs to FERPA + COPPA Decision Cards (mirror `pii-student-vault-contract-profile` conformance) |
| `publisher` | recommended | Who emitted the record + role |
| `signature` | recommended | ed25519 |
| `prev_hash` | ✓ | SHA-256 of prior record (or 64 zeros) |
| `hash` | ✓ | Canonical-JSON SHA-256 of body |

## Per-state lifecycle state machine

Each state's status evolves independently. The verifier enforces the per-state state machine:

```
not-deployed ─┬─→ deployment-planning ──→ submission-pending ──→ submission-under-state-review
              │                                                       │
              └→ exempt (terminal)                                     ├─→ disclosure-published ←┐
                                                                       │                          │
                                                                       ├─→ disclosure-published-with-conditions ←┐
                                                                       │                                           │
                                                                       └─→ non-conformant-remediation-pending ───→ (back to published)
                                                                                                                       │
              All states can transition to → withdrawn-from-state (terminal)
```

The verifier in [`src/verify.mjs`](./src/verify.mjs) enforces these as the only valid per-state transitions.

## What the verifier enforces

1. **Hash + prev_hash** consistency.
2. **record_version** is `0.1`.
3. **states_in_scope coverage** — every in-scope state must have a `per_state_status` entry.
4. **Per-state lifecycle state-machine** — replays transitions per state, enforces valid state-to-state moves, verifies last transition's `to_state` matches the per-state `current_status`.
5. **Federal floor reference** — products with `under_13_users = true` MUST carry a `federal_floor_compliance.coppa_decision_card_uri`.

## Examples

| File | Scenario |
| --- | --- |
| [`examples/tutorai-3-state-deployment.json`](./examples/tutorai-3-state-deployment.json) | VendorY TutorAI v3.4 deployed across IL (SOPPA, disclosure-published), CA (AB 1584 + AB 2876, disclosure-published-with-conditions pending bias remediation), TX (HB 18 SCOPE, submission-pending after statute amendment refresh). Three independent per-state state-machine threads, each with its own transitions, plus federal floor cross-references. |

Passes the verifier:

```bash
$ npm run verify-all
OK:   hash matches recomputed canonical SHA-256
OK:   prev_hash well-formed
OK:   record_version is 0.1
OK:   every in-scope state has a per_state_status entry (3 states)
OK:   [IL] state-machine consistent (3 transitions, current = 'disclosure-published')
OK:   [CA] state-machine consistent (3 transitions, current = 'disclosure-published-with-conditions')
OK:   [TX] state-machine consistent (2 transitions, current = 'submission-pending')
OK:   under-13 deployment carries coppa_decision_card_uri

Verification PASSED.
```

## Composes with

| Repo | Role |
| --- | --- |
| [`pii-student-vault-contract-profile`](https://github.com/mizcausevic-dev/pii-student-vault-contract-profile) | `federal_floor_compliance.ferpa_decision_card_uri` + `coppa_decision_card_uri` typically conform to this vault contract profile |
| [`ferpa-readiness-evidence-bundle`](https://github.com/mizcausevic-dev/ferpa-readiness-evidence-bundle) | The federal-floor FERPA evidence is assembled here; this tracker references it |
| [`student-cohort-bias-coverage-lab`](https://github.com/mizcausevic-dev/student-cohort-bias-coverage-lab) | When a state statute (e.g. CA AB 2876) requires bias disclosure, the bias-coverage bundle is named in `statute_specific_fields_documented[].evidence_uri` |
| [`ai-student-record-incident-card-profile`](https://github.com/mizcausevic-dev/ai-student-record-incident-card-profile) | Per-state breach-notification statutes (IL SOPPA, NY ED Law 2-d, etc.) get their deadline metadata from this tracker, then populate the Incident Card's `state_breach_obligations[]` |
| [`student-data-access-audit-stream`](https://github.com/mizcausevic-dev/student-data-access-audit-stream) | Access-log requirements per state statute reference this tracker's state list |
| [`fda-samd-classification-board`](https://github.com/mizcausevic-dev/fda-samd-classification-board) | Sibling HealthTech repo — same hash-chain shape + state-machine pattern, FDA SaMD classification + PCCP instead of 50-state student-data-privacy regimes |

## Compliance posture

EdTech-readiness scaffolding for multistate AI-product disclosure-lifecycle records. The schema and reference verifier support a vendor's program toward FERPA + COPPA federal-floor compliance + state student-data-privacy law readiness (IL SOPPA, CA AB 1584 + AB 2876, TX HB 18 / SCOPE, NY ED Law 2-d, Virginia ChAIPA, Colorado SB 196 / AI Act, Connecticut SB 1103, Maryland HB 1255, and 40+ others) — does not by itself establish compliance with any of them. Per the standing public-language guardrail: *readiness · evidence · posture · controls · scaffolding* — never "SOPPA-compliant" or "AB 2876-cleared" without an external attestation.

## License

MIT — see [`LICENSE`](./LICENSE). Spec + reference-verifier repos in the Suite are MIT-licensed so adopters can implement freely; full reference implementations are AGPL-3.0.
