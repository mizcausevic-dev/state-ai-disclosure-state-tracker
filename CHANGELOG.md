# Changelog

All notable changes to the State AI Disclosure State Tracker.

## [0.1] — 2026-05-29

### Added

- Initial schema (`schema/state-ai-disclosure-record.schema.json`) with hash-chained per-state lifecycle record shape, per-state `current_status` enum (8 states), per-state state machine, statute-citation sub-object (with `covers[]` enum for student-data-privacy / ai-specific-disclosure / bias-disclosure / biometric-data / etc.).
- Reference verifier (`src/verify.mjs`) — re-derives canonical-JSON SHA-256; verifies in-scope-state coverage; replays per-state state machine per state; enforces federal-floor reference for under-13 deployments.
- Hash builder (`src/build-examples.mjs`).
- Canonical example: VendorY TutorAI v3.4 multistate deployment across Illinois (SOPPA, disclosure-published), California (AB 1584 + AB 2876, disclosure-published-with-conditions), Texas (HB 18 / SCOPE, submission-pending after statute refresh). Three independent state-machine threads.
- Cross-spec linkage to FERPA + COPPA Decision Cards via `federal_floor_compliance` sub-object.
- Standing public-language guardrail respected in README.

### Not yet

- Per-state statute pre-populated tables — currently the schema is open-ended; Phase 2 will ship a `state-statute-table.json` companion catalog with the 50-state statute citations + covers[] pre-filled.
- AJV-based JSON Schema validation in the verifier (currently structural rules only).
- Statute-refresh alert workflow (Phase 2 — automated detection when a state statute amends).
- State ED contact directory normalization (Phase 2).
- Worked example for a non-conformant-remediation-pending state (Phase 2).
