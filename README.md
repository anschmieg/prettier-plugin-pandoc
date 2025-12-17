# prettier-plugin-pandoc

A [Prettier](https://prettier.io) plugin for formatting **Pandoc Markdown** (`.md`) and **Quarto** documents (`.qmd`).

[![CI](https://github.com/anschmieg/prettier-plugin-pandoc/actions/workflows/test.yml/badge.svg)](https://github.com/anschmieg/prettier-plugin-pandoc/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/prettier-plugin-pandoc)](https://www.npmjs.com/package/prettier-plugin-pandoc)

> [!WARNING]
> This plugin is currently in early development. It has been verified against a comprehensive suite of syntax test cases, but has not yet been battle-tested on a large number of real-world projects. Please use with caution and backup your data (e.g. via git) before formatting.

## Features

### Dual Parser Support

This plugin includes two parsers to handle the subtle differences between standard Pandoc Markdown and Quarto's extended syntax:

- **`pandoc` parser** - Standard Pandoc for `.md` files
  - ✅ Citations: `[@smith2020]`
  - ✅ Definition lists
  - ✅ Divs/Callouts: `::: {.note}`
  - ✅ GFM (tables, task lists, etc.)
  - ✅ Math blocks (standard)

- **`quarto` parser** - Extended support for `.qmd` files
  - ✅ **Everything in Pandoc parser**
  - ✅ Math blocks with labels: `$$ E=mc^2 $$ {#eq-einstein}`
  - ✅ Shortcodes: `{{< meta title >}}`

### Safety Features

- **Code block protection** - Content inside fenced code blocks is never modified
- **Lossless round-trips** - Formatting preserves all attributes and metadata
- **Tested** - Comprehensive automated test suite ensuring semantic equivalence

## Installation

```bash
npm install --save-dev prettier prettier-plugin-pandoc
```

## Usage

### Automatic Configuration

Prettier automatically uses the `quarto` parser for `.qmd` files.

For `.md` files, Prettier defaults to its built-in Markdown parser. You must explicitly configure it to use the `pandoc` parser if you want to support Pandoc features like citation syntax or definition lists.

**.prettierrc**
```json
{
  "plugins": ["prettier-plugin-pandoc"],
  "overrides": [
    {
      "files": "*.md",
      "options": {
        "parser": "pandoc"
      }
    }
  ]
}
```

### Running Prettier

Format all documents:
```bash
npx prettier --write "**/*.{md,qmd}"
```

## Examples

### Pandoc Markdown (`.md`)

**Input:**
```markdown
# Citations

See @smith2020 for details.

Term
:   Definition
```

**Output:** (formatted, standard Pandoc syntax preserved)

### Quarto Document (`.qmd`)

**Input:**
```markdown
---
title: My Analysis
---

# Introduction

Black-Scholes (@eq-bs) is elegant:

$$
\frac{\partial C}{\partial t} + \frac{1}{2}\sigma^2 S^2 \frac{\partial^2 C}{\partial S^2} = rC
$$ {#eq-bs}

{{< meta title >}} uses R.
```

**Output:** (formatted, preserves all Quarto specific syntax)

## Compatibility

- **Prettier:** `^3.0.0`
- **Node.js:** `>=18.0.0` (ES modules)
- **Browser:** Bundled version available (55KB gzipped)
- **Pandoc:** Tested with Pandoc 3.1+
- **Quarto:** Tested with Quarto 1.4+

## Browser Usage

A pre-bundled version is available for browser applications:

```javascript
import * as prettier from 'prettier/standalone'
import pandocPlugin from 'prettier-plugin-pandoc/browser'

const formatted = await prettier.format(markdown, {
  parser: 'pandoc',
  plugins: [pandocPlugin],
})
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test
```

## Contributing

Contributions welcome! Please:

1. Open an issue first to discuss changes
2. Follow existing code style
3. Add tests for new features
4. Update README for user-facing changes

## License

MIT

## Credits

Built with:
- [Prettier](https://prettier.io)
- [micromark](https://github.com/micromark/micromark)
- [mdast-util-from-markdown](https://github.com/syntax-tree/mdast-util-from-markdown)
- [@benrbray/micromark-extension-cite](https://github.com/benrbray/micromark-extension-cite)
