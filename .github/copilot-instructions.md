# Copilot Instructions for prettier-plugin-quarto

## Project Overview
A production-grade Prettier plugin to provide full formatting support for Quarto (`.qmd`) documents. It extends Prettier's Markdown parser to natively understand and format Quarto-specific syntax (Divs, Callouts, Equation Labels) without corruption.

## Tech Stack
- **Language**: TypeScript
- **Framework**: Prettier Plugin API (v3+)
- **Parser Ecosystem**: `micromark`, `micromark-extension-directive`, `remark`, `mdast`
- **Testing**: `vitest`
- **Package Manager**: `bun`

## Architecture Guidelines

### 1. AST Extension Strategy (Critical)
We use **True AST Extension**, NOT Regex masking or plain text preservation.
*   **Parsing**: You **MUST** use `micromark` extensions.
    *   **Divs/Spans**: `micromark-extension-directive` + `mdast-util-directive`.
    *   **Math**: `micromark-extension-math` + `mdast-util-math`.
*   **AST**: Map tokens to `mdast` nodes (`containerDirective`, `math`).
    *   **Forbidden**: Parsing `:::` or `$$` as `paragraph` or `text`.
*   **Printing**: Extend the Prettier Markdown printer to output these nodes.
    *   Reconstruct the fence `:::` from the node data.
    *   Format attributes `{key="val"}` properly.

### 2. Embedded Languages
Code blocks (R, Python, Julia, Observable) are handled via Prettier's `embed()` API.
*   **Delegation**: Do NOT bundle parsers for languages. Use `textToDoc` to delegate to whatever plugins the user has installed.
*   **Fallback**: If no plugin claims the language, print as is.

### 3. Syntax Scope
The plugin must support:
*   **Equation Labels**: `$$ ... $$ {#eq-label}` (Must be parsed as a Math node with attributes, not trailing text).
*   **Fenced Divs**: `::: {.class}` and nested Divs.
*   **Callouts**: Special styling/handling for `::: {.callout-note}`.
*   **Figure Attributes**: `![...](...){#fig-id}`.
*   **Inline Attributes**: `[text]{.class}`.
*   **Code Block Options**: Hash-pipes `#| echo: false` (ensure they are preserved as comments/directives).

## Coding Conventions
*   **TypeScript**: Use strict types. Avoid `any` where possible.
*   **Prettier API**: strict adherence to Prettier's 3.0+ API (async `parse`, `embed`).
*   **Immutability**: Do not mutate AST nodes in place if possible; produce new trees.
*   **Idempotency**: `format(format(code))` MUST equal `format(code)`.

## Development Commands
```bash
bun install           # Install dependencies
bun run build         # Build the plugin
bun run test          # Run Vitest suite
```

## Testing Rules
*   Every syntax feature key must have a corresponding `.qmd` snapshot test in `test/`.
*   Tests must verify that the output is valid Quarto (e.g., `quarto check` would pass, conceptually).
