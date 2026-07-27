# Condition profile contracts

This directory contains the runtime data and validation contracts for Inner Echo profiles and experience dimensions. Profiles define audiovisual metaphors. They do not diagnose, assess, or simulate a medical condition.

## Files

| Path | Purpose |
|---|---|
| `catalog.json` | Profile labels, descriptions, tags, and evidence links shown by the interface. |
| `experience-dimensions.json` | Supported experience dimensions and evidence metadata. |
| `dimension-to-signal-mapping.json` | Default video and audio motifs used by dimension composition. |
| `profiles/*.json` | Runtime profile definitions. |
| `schema.ts` | Zod schemas for catalog and profile data. |
| `loader.ts` | Bundled catalog and profile loading. |
| `graphBuilder.ts` | Video-node construction from profile stacks. |
| `controlTargets.ts` | Supported user-control targets. |
| `MAPPING.md` | Summary of profile-to-dimension mappings. |
| `EVIDENCE.md` | Dimension evidence index. |

## Runtime contract

Each profile can define:

- weighted experience dimensions
- ordered video and audio stacks
- user controls
- safety defaults and maximums
- Safe Mode clamps
- Reduced Motion behavior
- warning text
- bounded reactive mappings

Node identifiers and parameters must match the runtime graph builders and `src/contractVerification/` registries. Unknown entries must fail validation or be reported and skipped by the runtime. They must not produce a false active state.

## Required checks

After changing a profile, dimension, mapping, schema, or node reference, run:

```bash
npm run conditions:validate
npm run composer:validate
npm run evidence:verify
npm run verify:contracts
npm test
```

Run `npm run docs:gen` and `npm run evidence:gen` when their source inputs change.

## Safety boundary

Profiles must keep conservative intensity and audio defaults, explicit maximums, Stop Everything, Safe Mode, Reduced Motion, and audio mute behavior. Do not add strobe effects, unbounded temporal feedback, abrupt motion, or sudden loud transients.

See [../../docs/40_CONDITIONS.md](../../docs/40_CONDITIONS.md) and [../../docs/30_SAFETY_ETHICS.md](../../docs/30_SAFETY_ETHICS.md).
