# Compile to LangChain (end-to-end)

This example compiles the `SKILL.md` + `effector.toml` in this folder into a LangChain `StructuredTool` using `@effectorhq/core`.

## Run

If you run this example outside the `effector-core` repo, run `npm install @effectorhq/core` first.

```bash
node compile.js
```

## Output

- `output/langchain-structured-tool.py` (preferred)
- or `output/langchain-structured-tool.json` (fallback if output format changes)

