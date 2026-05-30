#!/usr/bin/env node
// verify.mjs — validate a state-AI-disclosure record against schema invariants
// + per-state lifecycle state machine, re-derive canonical-JSON SHA-256.
//
// Usage: node src/verify.mjs <record.json>

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Per-state lifecycle state machine. Each state's status evolves independently.
const VALID_TRANSITIONS = {
  "not-deployed":                        new Set(["deployment-planning", "exempt"]),
  "deployment-planning":                 new Set(["submission-pending", "withdrawn-from-state"]),
  "submission-pending":                  new Set(["submission-pending", "submission-under-state-review", "withdrawn-from-state"]),
  "submission-under-state-review":       new Set(["disclosure-published", "disclosure-published-with-conditions", "non-conformant-remediation-pending", "withdrawn-from-state"]),
  "disclosure-published":                new Set(["disclosure-published", "disclosure-published-with-conditions", "non-conformant-remediation-pending", "withdrawn-from-state"]),
  "disclosure-published-with-conditions":new Set(["disclosure-published", "non-conformant-remediation-pending", "withdrawn-from-state"]),
  "non-conformant-remediation-pending":  new Set(["disclosure-published", "withdrawn-from-state"]),
  "withdrawn-from-state":                new Set([]),
  "exempt":                              new Set([])
};

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
}
function sha256Hex(s) { return createHash("sha256").update(s).digest("hex"); }
function fail(msg) { console.error("FAIL:", msg); process.exitCode = 1; }
function ok(msg)   { console.log("OK:  ", msg); }

const path = process.argv[2];
if (!path) { console.error("usage: node src/verify.mjs <record.json>"); process.exit(2); }

const raw = readFileSync(path, "utf8");
let record;
try { record = JSON.parse(raw); } catch (e) { fail(`JSON parse error: ${e.message}`); process.exit(1); }

// --- hash
const { hash, ...bodyWithoutHash } = record;
const recomputed = sha256Hex(canonicalJson(bodyWithoutHash));
if (recomputed === hash) ok(`hash matches recomputed canonical SHA-256 (${hash.slice(0, 12)}…)`);
else fail(`hash mismatch: claimed ${hash}, recomputed ${recomputed}`);

// --- prev_hash
if (!/^[0-9a-f]{64}$/.test(record.prev_hash)) fail(`prev_hash not 64 hex: ${record.prev_hash}`);
else ok(`prev_hash well-formed (${record.prev_hash === "0".repeat(64) ? "genesis" : "linked"})`);

// --- record_version
if (record.record_version !== "0.1") fail(`record_version must be '0.1', got '${record.record_version}'`);
else ok("record_version is 0.1");

// --- per-state coverage check: every state_in_scope MUST have a per_state_status entry
const inScope = new Set(record.states_in_scope ?? []);
const haveStatus = new Set((record.per_state_status ?? []).map((s) => s.state_code));
const missing = [...inScope].filter((s) => !haveStatus.has(s));
if (missing.length > 0) fail(`states_in_scope contains states with no per_state_status entry: ${missing.join(", ")}`);
else ok(`every in-scope state has a per_state_status entry (${inScope.size} states)`);

// --- per-state lifecycle state-machine — replay transitions per state
const transitionsByState = {};
for (const t of record.transitions ?? []) {
  const sc = t.trigger?.state_code;
  if (!sc) {
    fail(`transition at ${t.transition_at} has no trigger.state_code`);
    continue;
  }
  transitionsByState[sc] ??= [];
  transitionsByState[sc].push(t);
}

for (const [sc, tlist] of Object.entries(transitionsByState)) {
  let prevState = tlist[0].from_state;
  let lastTo = null;
  for (let i = 0; i < tlist.length; i++) {
    const t = tlist[i];
    if (t.from_state !== prevState) {
      fail(`[${sc}] transition #${i+1}: from_state '${t.from_state}' != prior to_state '${prevState}'`);
      break;
    }
    const allowed = VALID_TRANSITIONS[t.from_state];
    if (!allowed) {
      fail(`[${sc}] transition #${i+1}: from_state '${t.from_state}' unknown`);
      break;
    }
    if (!allowed.has(t.to_state)) {
      fail(`[${sc}] transition #${i+1}: '${t.from_state}' → '${t.to_state}' not valid`);
      break;
    }
    prevState = t.to_state;
    lastTo = t.to_state;
  }
  // check that lastTo matches the current_status for this state
  const stateStatus = (record.per_state_status ?? []).find((s) => s.state_code === sc);
  if (stateStatus && lastTo && lastTo !== stateStatus.current_status) {
    fail(`[${sc}] last transition's to_state '${lastTo}' does not match current_status '${stateStatus.current_status}'`);
  } else if (stateStatus && lastTo) {
    ok(`[${sc}] state-machine consistent (${tlist.length} transitions, current = '${lastTo}')`);
  }
}

// --- federal_floor reference if product has under-13 users
if (record.product?.under_13_users === true && !record.federal_floor_compliance?.coppa_decision_card_uri) {
  fail(`product.under_13_users = true but federal_floor_compliance.coppa_decision_card_uri missing`);
} else if (record.product?.under_13_users === true) {
  ok(`under-13 deployment carries coppa_decision_card_uri`);
}

if (process.exitCode === 1) console.error("\nVerification FAILED.");
else console.log("\nVerification PASSED.");
