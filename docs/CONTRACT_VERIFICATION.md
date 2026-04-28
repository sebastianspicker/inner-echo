# Contract Verification

`inner-echo` treats condition/profile JSON as a runtime contract.  
The contract verifier checks that JSON references match implemented effect nodes and parameters.

## Command

Run:

```bash
npm run verify:contracts
```

Outputs:

- `reports/contract-verification.json`
- `reports/contract-verification.md`

Exit behavior:

- non-zero when contract **errors** exist
- zero when only **warnings** exist

## Registry Metadata

Implemented node metadata lives in:

- `src/contractVerification/videoNodeRegistry.ts`
- `src/contractVerification/audioNodeRegistry.ts`

Each node contract declares:

- node id (and aliases)
- supported parameters
- parameter type (`number`, `boolean`, `enum`)
- defaults
- min/max bounds (where applicable)
- optional Safe Mode clamp key linkage
- deterministic probe reader used for runtime verification

This metadata is introspection-only and must not change runtime semantics.

## What Gets Verified

The verifier parses:

- `src/conditions/profiles/*.json`
- `src/conditions/dimension-to-signal-mapping.json`
- `src/conditions/experience-dimensions.json`

Checks:

- node existence
- parameter existence
- parameter usage (probe low/high values -> measurable runtime difference)
- range/clamp adherence for numeric params
- policy checks (Reduced Motion and Safe Mode behavior)

## Adding a New Node Safely

When adding a new video/audio node:

1. Implement runtime node/fx as usual.
2. Add/update factory registration in runtime builder (`graphBuilder` / `audioGraphBuilder`).
3. Add node metadata + probe mapping in `src/contractVerification/*NodeRegistry.ts`.
4. Ensure probes expose measurable effect for each declared parameter.
5. Run:

```bash
npm test
npm run verify:contracts
```

## Updating JSON Safely

When changing JSON contracts:

1. Do not add unknown node ids.
2. Do not add unknown parameter keys for existing nodes.
3. Keep Reduced Motion and Safe Mode contracts aligned with implementation.
4. Run `npm run verify:contracts` before commit.

If a mismatch appears, fix runtime implementation (or registry metadata/probes) to match the existing contract definitions.
