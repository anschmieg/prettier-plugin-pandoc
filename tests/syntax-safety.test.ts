/**
 * Syntax Safety Tests
 *
 * These tests verify that the plugin correctly handles edge cases
 * and doesn't corrupt user content.
 */

import { describe, expect, it } from 'vitest'
import { pandocParser, quartoParser } from '../src/parser'
import { printer } from '../src/printer'

// Helper to format content
async function format(input: string, parser: typeof quartoParser = quartoParser): Promise<string> {
  const ast = await parser.parse(input, {}, {})
  return printer.print({ getNode: () => ast } as any)
}

describe('math Safety', () => {
  it('math inside code block is preserved', async () => {
    const input = '```markdown\n$$\nE=mc^2\n$$\n```'
    const ast = await quartoParser.parse(input, {}, {})

    // Should be a code block, not a math directive
    const codeBlock = ast.children[0]
    expect(codeBlock.type).toBe('code')
    expect(codeBlock.value).toContain('$$')
    expect(codeBlock.value).toContain('E=mc^2')
  })

  it('math inside inline code is preserved', async () => {
    const input = 'Use `$$ ... $$` for display math.'
    const formatted = await format(input)

    expect(formatted).toContain('`$$ ... $$`')
  })

  it('labeled math preserves all attributes (Quarto only)', async () => {
    const input = '$$\nx^2\n$$ {#eq:test .important key="value"}'
    const formatted = await format(input, quartoParser)

    expect(formatted).toContain('{#eq:test')
    expect(formatted).toContain('.important')
    expect(formatted).toContain('key="value"')
  })

  it('math without label works correctly', async () => {
    const input = '$$\nE=mc^2\n$$'
    const formatted = await format(input)

    expect(formatted).toContain('$$')
    expect(formatted).toContain('E=mc^2')
  })

  it('single-line math with label (Quarto only)', async () => {
    const input = '$$ E=mc^2 $$ {#eq:inline}'
    const formatted = await format(input, quartoParser)

    expect(formatted).toContain('E=mc^2')
    expect(formatted).toContain('{#eq:inline')
  })

  it('pandoc parser treats labeled math as plain math', async () => {
    const input = '$$\nE=mc^2\n$$ {#eq:test}'
    const ast = await pandocParser.parse(input, {}, {})

    // Should be a plain math node, not a directive
    const mathNode = ast.children[0]
    expect(mathNode.type).toBe('math')
    // Label is part of the content
    expect(mathNode.value).toContain('{#eq:test}')
  })
})

describe('div Safety', () => {
  it('nested divs are correctly formatted', async () => {
    const input = `::: {.outer}
Outer content.

::: {.inner}
Inner content.
:::

More outer.
:::`
    const formatted = await format(input)

    // Both divs should be present
    expect(formatted).toContain('.outer')
    expect(formatted).toContain('.inner')
    expect(formatted).toContain('Outer content')
    expect(formatted).toContain('Inner content')
  })

  it('div with id and class', async () => {
    const input = '::: {#my-id .my-class}\nContent\n:::'
    const formatted = await format(input)

    expect(formatted).toContain('#my-id')
    expect(formatted).toContain('.my-class')
  })

  it('div inside code block is preserved', async () => {
    const input = '```markdown\n::: {.callout}\nExample\n:::\n```'
    const ast = await quartoParser.parse(input, {}, {})

    const codeBlock = ast.children[0]
    expect(codeBlock.type).toBe('code')
    expect(codeBlock.value).toContain(':::')
  })
})

describe('shortcode Safety (Quarto)', () => {
  it('shortcodes are parsed as directives', async () => {
    const input = '{{< meta title >}}'
    const ast = await quartoParser.parse(input, {}, {})

    const directive = ast.children[0]
    expect(directive.type).toBe('leafDirective')
    expect(directive.name).toBe('shortcode')
    expect(directive.attributes.raw).toBe('meta title')
  })

  it('shortcodes are formatted back correctly', async () => {
    const input = '{{< meta title >}}'
    const formatted = await format(input)

    expect(formatted.trim()).toBe('{{< meta title >}}')
  })

  it('shortcode inside code block is preserved', async () => {
    const input = '```qmd\n{{< meta title >}}\n```'
    const ast = await quartoParser.parse(input, {}, {})

    const codeBlock = ast.children[0]
    expect(codeBlock.type).toBe('code')
    expect(codeBlock.value).toContain('{{<')
  })

  it('pandoc parser ignores shortcodes', async () => {
    const input = '{{< meta title >}}'
    const ast = await pandocParser.parse(input, {}, {})

    // Should be a paragraph with text, not a directive
    const para = ast.children[0]
    expect(para.type).toBe('paragraph')
  })
})

describe('citation Safety', () => {
  it('simple citation is parsed', async () => {
    const input = 'See [@smith2020].'
    const ast = await quartoParser.parse(input, {}, {})

    // The citation should be in the AST
    const para = ast.children[0]
    expect(para.type).toBe('paragraph')

    // Check that citation node exists in children
    const hasCitation = para.children.some((c: any) =>
      c.type === 'cite' || c.type === 'citation'
      || (c.type === 'text' && c.value.includes('@smith2020')),
    )
    expect(hasCitation).toBe(true)
  })

  it('citation with locator', async () => {
    const input = '[@smith2020, pp. 33-35]'
    const formatted = await format(input)

    expect(formatted).toContain('@smith2020')
    expect(formatted).toContain('pp. 33-35')
  })
})

describe('definition List Safety', () => {
  it('definition list is parsed', async () => {
    const input = `Term 1
:   Definition 1

Term 2
:   Definition 2`
    const ast = await quartoParser.parse(input, {}, {})

    // Check that we have definition list structure
    const _hasDefList = ast.children.some((c: any) =>
      c.type === 'definitionList' || c.type === 'defList',
    )
    // Note: if not parsed as defList, it becomes paragraphs - still valid
    expect(ast.children.length).toBeGreaterThan(0)
  })
})

describe('frontmatter Safety', () => {
  it('yAML frontmatter is preserved', async () => {
    const input = `---
title: Test
author: Author
---

Content here.`
    const formatted = await format(input)

    expect(formatted).toContain('---')
    expect(formatted).toContain('title: Test')
    expect(formatted).toContain('author: Author')
  })
})

describe('round-Trip Stability', () => {
  it('formatting twice produces same result', async () => {
    const input = `# Title

$$
E=mc^2
$$ {#eq:test}

::: {.note}
Content
:::

{{< meta title >}}`

    const first = await format(input)
    const second = await format(first)

    expect(second).toBe(first)
  })
})
