# Prompt Kinds Share One Record; Sequence Steps Live in the Body

promptrc keeps four Kinds of Prompt — plain prompts, Fragments, Sequences, and Benchmarks — and we store all of them as the same Prompt record with a `kind` column instead of separate tables or polymorphic payloads. A Sequence's Steps are kept inside the ordinary Prompt Body, separated by a `<!-- step -->` marker line, and a Benchmark's expected result is its Notes while its Runs live in a small `runs_json` column. We chose this because search, sharing, images, first-sign-in copy, and starter Prompts already work on one record shape, and an HTML-comment marker keeps every body readable markdown that renders sensibly anywhere.

## Consequences

- The D1 migration is purely additive (`kind`, `pinned`, `notes`, `runs_json`, all with defaults), so existing rows read back as plain, unpinned Prompts and older local snapshots still validate.
- Validation treats the new fields as optional on input for backward compatibility, but rejects invalid values.
- Splitting and joining Steps is a model concern (`model/prompt-sequences.ts`); the editor keeps its own step array while typing so empty Steps and trailing whitespace survive.
- Changing a Prompt's Kind is lossless: switching away from a Sequence joins its Steps with blank lines.
- Runs are a capped log (200, newest first), not an analytics store. If Benchmarks ever need cross-Prompt reporting, Runs should move to their own table.
