# Derived contract references

Do not edit the catalog or schema reference files by hand. Update their source contracts and run:

```bash
npm run docs:gen
```

`tools/docs/gen-docs.ts` derives the files deterministically.

| File | Source and purpose |
|---|---|
| `conditions-catalog.md` | Catalog and profile data, including tags, safety intensity maximums, nodes, and warnings. |
| `preset-schema.json` | Draft 7 JSON Schema derived from the profile Zod schema. |
| `preset-schema.md` | Human-readable profile schema summary. |

Run the command after changing catalog entries, profile structure, profile safety fields, or the schema derivation script. Commit the resulting changes only when they match the source change and pass repository validation.
