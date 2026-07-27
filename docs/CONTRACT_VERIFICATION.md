# Contract verification

Condition and profile JSON is a runtime contract. The verifier checks that JSON references align with implemented audio and video nodes, parameters, ranges, and policy behavior.

## Command

```bash
npm run verify:contracts
```

The command writes ignored local reports:

- `reports/contract-verification.json`
- `reports/contract-verification.md`

It exits nonzero when contract errors exist. Warnings are reported separately.

## Registry metadata

Implemented node metadata is defined in:

- `src/contractVerification/videoNodeRegistry.ts`
- `src/contractVerification/audioNodeRegistry.ts`

Each contract can declare an identifier, aliases, supported parameters, parameter type, default, bounds, Safe Mode clamp linkage, and deterministic probe reader.

Registry metadata is introspection-only. It must describe runtime behavior without changing it.

## Inputs and checks

The verifier reads:

- `src/conditions/profiles/*.json`
- `src/conditions/dimension-to-signal-mapping.json`
- `src/conditions/experience-dimensions.json`

It checks:

- node and parameter existence
- measurable parameter use through low and high probes
- numeric range and clamp alignment
- Safe Mode and Reduced Motion policy references
- mapping targets used by profiles and composer output

## Adding or changing a node

1. Implement the runtime node or audio module.
2. Register it in the runtime graph builder.
3. Add matching registry metadata and probes.
4. Update profile, mapping, schema, and documentation inputs when applicable.
5. Add a focused regression test.
6. Run `npm test` and `npm run verify:contracts`.

Unknown references must not create a successful verification result. Fix the runtime, source contract, or metadata at the shared boundary.
