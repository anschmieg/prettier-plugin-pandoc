# Developer Context: prettier-plugin-quarto implementation

## Mission (Production Ready)
Implement a **complete, production-grade** Prettier plugin for Quarto (`.qmd`). It must extend the Markdown parser to natively understand and format ALL Quarto syntax elements. This is NOT a hacky experiment; it is the foundation for a published NPM package.

### 1. Scope of Syntax Support (The "True AST" Standard)
The plugin must parse, node-ify, and format the following. Everything else is standard Markdown.

#### A. Pandoc Markdown Support (Ref: `src/pandoc/`)
These are standard extensions supported by Pandoc.
*   **Frontmatter**: YAML metadata blocks (start/end `---`).
*   **Divs**: `::: {.class #id key=val}` blocks.
*   **Spans**: `[content]{.class #id}` inline.
*   **Math**:
    *   Inline: `$ E=mc^2 $`
    *   Block: `$$ E=mc^2 $$`
    *   **Labels**: `$$ ... $$ {#eq-label}` (Must be attached to the Math node).
*   **Lists**:
    *   **Definition Lists**: `Term` \n `: Definition`.
    *   **Task Lists**: `- [ ] TODO`.
    *   **Fancy Lists**: `i.`, `a.`, `1)`. (Preserve markers).
*   **Tables**:
    *   **Pipe Tables**: `| Col |` (GFM style).
    *   **Grid Tables**: `+---+`.
*   **Citations**: `@citation_key`, `[@citation]`.
*   **Footnotes**: `[^1]`.
*   **Raw Attributes**: `{=html}`, `{=latex}`.
*   **Smart Typography**: Quotes, dashes (preserve or standard prettier behavior).

#### B. Quarto Extensions Support (Ref: `src/quarto/`)
These are specific strict extensions added by Quarto.
*   **Shortcodes**: `{{< shortcode arg >}}`. (CRITICAL: Unique parser needed).
*   **Callouts**: Divs with class `.callout-*`. (Special formatting overlap with Divs).
*   **Cross-References**: `@eq-`, `@fig-`, `@tbl-`, `@sec-`.
*   **Code Block Options**: `#| key: val` inside fences.
*   **Layout Attributes**: `::: {layout-ncol=2}`.
*   **Computation Blocks**: ````{python}`, ````{r}`.

### 2. Strategy: True AST Extension (CRITICAL)
**Constraint**: You MUST NOT use "plain text preservation". Formatting `::: {.class}` as a simple text paragraph is a FAILURE.

1.  **Parser Extension**:
    *   **Divs/Spans**: Use `micromark-extension-directive` and `remark-directive`.
    *   **Math**: Use `remark-math` (if supports attributes) or write a custom micromark extension for `$$ ... $$ {#id}`.
    *   **Validation**: The parser should fail (or produce an error node) if the syntax is invalid.
2.  **AST Structure**:
    *   `:::` blocks must become `containerDirective` nodes.
    *   `$$` blocks must become `math` nodes (with `attributes`).
3.  **Printers**:
    *   Implement specific printers for `containerDirective`, `textDirective`, `math`.
    *   This allows us to formatting the *inside* of the block differently than the outside.

### 3. Architecture & Modularity (IMPORTANT)
Structure the code to facilitate a future split into `prettier-plugin-pandoc`:

*   `src/pandoc/`: Put standard Pandoc syntax extensions here.
    *   `div.ts` (Divs/Spans)
    *   `math.ts` (Equation labels)
    *   `citation.ts` (Citations)
    *   `definition-list.ts` (if applicable)
*   `src/quarto/`: Put Quarto-only extensions here.
    *   `shortcodes.ts` (`{{< >}}` parser)
    *   `callouts.ts` (Special rendering for `.callout`)
    *   `code-block.ts` (Hash-pipes `#|` logic)
*   `src/index.ts`: Compose them together.

### 4. Implementation Guardrails (STRICT)
To prevent "shortcuts", you must adhere to these rules:

1.  **NO Plain Text Preservation**: You cannot just let `fromMarkdown` parse Divs as paragraphs.
    *   *Forbidden*: `fromMarkdown(text)` (without extensions).
    *   *Required*: `fromMarkdown(text, { extensions: [directive()], mdastExtensions: [directiveFromMarkdown()] })`.
4.  **Dependencies**: You MUST use and configure:
    *   `micromark-extension-directive` & `mdast-util-directive` (for Divs/Callouts)
    *   `micromark-extension-frontmatter` & `mdast-util-frontmatter` (CRITICAL for YAML metadata)
    *   `micromark-extension-gfm` & `mdast-util-gfm` (for Tables, Tasklists, Autolinks)
    *   `micromark-extension-math` & `mdast-util-math` (for Equations)
5.  **Verification**: You CANNOT mark the task as done until you run `bun run debug-ast.ts` and see output containing:
    *   `"type": "containerDirective"` (Divs)
    *   `"type": "math"` (Equations)
    *   `"type": "yaml"` (Frontmatter)
    *   `"type": "table"` (GFM Tables).
If you see `"type": "paragraph"` for these elements, you have FAILED.

## Next Steps for Implementation Agent
1.  Run `bun install`.
2.  **Install AST Libs**: `bun add micromark-extension-directive mdast-util-directive micromark-extension-math mdast-util-math`.
3.  **Refactor `parser.ts`**:
    *   Import the extensions.
    *   Configure `fromMarkdown` to use them.
4.  **Refactor `printer.ts`**:
    *   Handle `containerDirective`, `leafDirective`, `textDirective`.
    *   Handle `math` (inline and block).
5.  **Verify**: Run `bun run debug-ast.ts` and confirm AST nodes are correct.
6.  **Fix Tests**: Update snapshot expectations (the AST change might slightly alter formatting of attributes).
