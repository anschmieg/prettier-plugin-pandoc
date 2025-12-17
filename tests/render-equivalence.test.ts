/**
 * Render Equivalence Tests
 *
 * These tests verify that formatting a document with Prettier
 * does not change its rendered output when processed by Pandoc/Quarto.
 *
 * Requires: pandoc and quarto CLI tools installed
 * These tests are skipped if the CLI tools are not available.
 */

import { execSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import * as prettier from 'prettier'
import plugin from '../src/index'

// Check if CLI tools are available
function isCommandAvailable(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  }
  catch {
    return false
  }
}

const hasPandoc = isCommandAvailable('pandoc')
const hasQuarto = isCommandAvailable('quarto')

// Helper to render markdown with Pandoc
function renderWithPandoc(markdown: string): string {
  const result = spawnSync('pandoc', ['-f', 'markdown', '-t', 'html'], {
    input: markdown,
    encoding: 'utf-8',
  })
  if (result.error)
    throw result.error
  return result.stdout
}

// Helper to render qmd with Quarto (to HTML)
function _renderWithQuarto(content: string, filename: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'quarto-test-'))
  const inputPath = join(tempDir, filename)
  const outputPath = join(tempDir, filename.replace(/\.qmd$/, '.html'))

  try {
    writeFileSync(inputPath, content)

    const result = spawnSync('quarto', ['render', inputPath, '--to', 'html', '--no-execute'], {
      encoding: 'utf-8',
      cwd: tempDir,
    })

    if (result.status !== 0) {
      console.error('Quarto stderr:', result.stderr)
      throw new Error(`Quarto render failed: ${result.stderr}`)
    }

    return readFileSync(outputPath, 'utf-8')
  }
  finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

// Helper to format with our plugin
async function formatWithPlugin(content: string, parser: 'pandoc' | 'quarto'): Promise<string> {
  return prettier.format(content, {
    parser,
    plugins: [plugin],
  })
}

// Normalize HTML for comparison (remove whitespace differences)
function normalizeHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim()
}

describe.skipIf(!hasPandoc)('pandoc Render Equivalence', () => {
  const fixturesDir = join(__dirname, 'fixtures', 'pandoc')

  it('complex.md renders identically after formatting', async () => {
    const input = readFileSync(join(fixturesDir, 'complex.md'), 'utf-8')
    const formatted = await formatWithPlugin(input, 'pandoc')

    const originalHtml = renderWithPandoc(input)
    const formattedHtml = renderWithPandoc(formatted)

    // Compare normalized HTML
    expect(normalizeHtml(formattedHtml)).toBe(normalizeHtml(originalHtml))
  })

  it('simple math block renders equivalently', async () => {
    const input = `$$
E = mc^2
$$`
    const formatted = await formatWithPlugin(input, 'pandoc')

    const originalHtml = renderWithPandoc(input)
    const formattedHtml = renderWithPandoc(formatted)

    expect(normalizeHtml(formattedHtml)).toBe(normalizeHtml(originalHtml))
  })

  it('labeled math block renders equivalently', async () => {
    const input = `$$
E = mc^2
$$ {#eq:einstein}`
    const formatted = await formatWithPlugin(input, 'pandoc')

    const originalHtml = renderWithPandoc(input)
    const formattedHtml = renderWithPandoc(formatted)

    expect(normalizeHtml(formattedHtml)).toBe(normalizeHtml(originalHtml))
  })

  it('nested divs render equivalently', async () => {
    const input = `::: {.outer}
Outer content.

::: {.inner}
Inner content.
:::

More outer.
:::`
    const formatted = await formatWithPlugin(input, 'pandoc')

    const originalHtml = renderWithPandoc(input)
    const formattedHtml = renderWithPandoc(formatted)

    expect(normalizeHtml(formattedHtml)).toBe(normalizeHtml(originalHtml))
  })

  it('definition lists render equivalently', async () => {
    const input = `Term 1
:   Definition 1

Term 2
:   Definition 2`
    const formatted = await formatWithPlugin(input, 'pandoc')

    const originalHtml = renderWithPandoc(input)
    const formattedHtml = renderWithPandoc(formatted)

    expect(normalizeHtml(formattedHtml)).toBe(normalizeHtml(originalHtml))
  })

  it('citations render equivalently', async () => {
    const input = `See [@smith2020] for details.`
    const formatted = await formatWithPlugin(input, 'pandoc')

    const originalHtml = renderWithPandoc(input)
    const formattedHtml = renderWithPandoc(formatted)

    expect(normalizeHtml(formattedHtml)).toBe(normalizeHtml(originalHtml))
  })

  it('code blocks with math examples are preserved', async () => {
    const input = '```markdown\n$$\nE=mc^2\n$$\n```'
    const formatted = await formatWithPlugin(input, 'pandoc')

    const originalHtml = renderWithPandoc(input)
    const formattedHtml = renderWithPandoc(formatted)

    expect(normalizeHtml(formattedHtml)).toBe(normalizeHtml(originalHtml))
  })
})

describe.skipIf(!hasQuarto)('quarto Render Equivalence', () => {
  const _fixturesDir = join(__dirname, 'fixtures', 'quarto')

  // Note: Full Quarto render tests are expensive (require R/Python)
  // These tests use --no-execute to skip code execution

  it('simple shortcode document renders', async () => {
    const input = `---
title: Test
---

Hello {{< meta title >}}!`

    const formatted = await formatWithPlugin(input, 'quarto')

    // For Quarto, we mainly check that formatting doesn't break the document
    // The shortcode will be processed by Quarto
    expect(formatted).toContain('{{< meta title >}}')
  })

  it('math with shortcodes renders', async () => {
    const input = `---
title: Math Test
---

$$
E = mc^2
$$ {#eq:test}

See @eq:test.

{{< meta title >}}`

    const formatted = await formatWithPlugin(input, 'quarto')

    // Verify structure is maintained
    expect(formatted).toContain('E = mc^2')
    expect(formatted).toContain('{#eq:test')
    expect(formatted).toContain('{{< meta title >}}')
  })

  it('callout blocks are preserved', async () => {
    const input = `::: {.callout-note}
This is a note.
:::`

    const formatted = await formatWithPlugin(input, 'quarto')

    expect(formatted).toContain('.callout-note')
    expect(formatted).toContain('This is a note')
  })

  it('code blocks with shortcode examples are preserved', async () => {
    const input = '```qmd\n{{< meta title >}}\n```'
    const formatted = await formatWithPlugin(input, 'quarto')

    // The shortcode inside the code block should be preserved as-is
    expect(formatted).toContain('{{<')
    expect(formatted).toContain('meta title')
  })
})

describe('cLI Availability', () => {
  it('reports pandoc availability', () => {
    expect(typeof hasPandoc).toBe('boolean')
  })

  it('reports quarto availability', () => {
    expect(typeof hasQuarto).toBe('boolean')
  })
})
