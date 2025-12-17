/**
 * Preprocessing utilities for Pandoc syntax to CommonMark directive syntax
 */

/**
 * Pre-process Pandoc fenced div syntax to be compatible with micromark-extension-directive
 *
 * Pandoc allows: ::: {.class} or ::: name {.class}
 * micromark-extension-directive requires: :::name{.class}
 *
 * Additionally, we handle nested divs by using different colon counts:
 * - Outer div: ::::div{.class} ... ::::
 * - Inner div: :::div{.class} ... :::
 *
 * This allows proper nesting support.
 */
import { getProtectedRanges, isProtected } from './safety'

export interface PreprocessOptions {
  enableShortcodes?: boolean
  enableMathLabels?: boolean // Quarto-specific: $$ {#eq:label}
}

export function preprocessPandocSyntax(text: string, options: PreprocessOptions = { enableShortcodes: true, enableMathLabels: true }): string {
  const protectedRanges = getProtectedRanges(text)
  const lines = text.split('\n')
  const result: string[] = []
  const divStack: number[] = [] // Track nesting depth
  let insideMathBlock = false
  let mathBuffer: string[] = []

  let currentOffset = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Calculate start offset of this line
    // currentOffset is at the start of the line

    // 1. Handle Math Blocks with Labels (Quarto-specific)
    if (options.enableMathLabels && line.trim().startsWith('$$')) {
      // Check if this line is protected (e.g. inside a code block)
      // Check the position of '$$'
      const matchIndex = line.indexOf('$$')
      const absoluteMatchIndex = currentOffset + matchIndex

      if (!isProtected(absoluteMatchIndex, protectedRanges)) {
        if (insideMathBlock) {
          // Closing the block
          // Relaxed regex: Just check for $$ and optional {attributes}
          // console.log('Checking close match for:', line)
          const closeMatch = line.trim().match(/^\$\$\s*(\{.*\})?$/)
          if (closeMatch) {
            insideMathBlock = false
            const label = closeMatch[1] // e.g. "{#eq-label}"

            // Only treat as Labeled Math if it actually HAS a label,
            // OR if we are forcing consistency.
            // IF no label, we should probably output as standard math $$ to avoid Directive overhead?
            // BUT if we mix them, printer logic gets complex.
            // Let's standardise on Directive if it has a label.
            // If it doesn't have a label, we can create a `math` directive without attrs,
            // or just output back $$ ... $$?
            // Let's output directive to be safe from swallowing.

            // Convert to directive: :::math{#label} or :::math
            // We rely on micromark-extension-directive to parse the attributes
            // But verify we aren't protected! (We already did)

            const attrs = label || ''
            result.push(`:::math${attrs}`)
            result.push(...mathBuffer)
            result.push(':::')

            mathBuffer = []
            // Update offset and continue
            currentOffset += line.length + 1
            continue
          }
          else {
            mathBuffer.push(line)
            // Update offset and continue
            currentOffset += line.length + 1
            continue
          }
        }
        else {
          // Opening block
          // Check single line $$ ... $$
          if (line.trim().match(/^\$\$.+\$\$/)) {
            // Single line math, pass through?
            // But what if it has label? $$ E=mc^2 $$ {#eq}
            const singleLineMatch = line.trim().match(/^\$\$(.+)\$\$\s*(\{.*\})?$/)
            if (singleLineMatch) {
              const content = singleLineMatch[1]
              const label = singleLineMatch[2] || ''

              result.push(`:::math${label}`)
              result.push(content)
              result.push(':::')
              currentOffset += line.length + 1
              continue
            }
            // Plain single line, let pass
            result.push(line)
            currentOffset += line.length + 1
            continue
          }

          // Block start
          const openMatch = line.trim().match(/^\$\$\s*(\{.*\})?$/)
          if (openMatch) {
            insideMathBlock = true
            // console.log('Opened math block')
            currentOffset += line.length + 1
            continue
          }
        }
      }
      // Else: Protected line starting with $$ (inside code block) - treat as normal text
    }

    if (insideMathBlock) {
      mathBuffer.push(line)
      currentOffset += line.length + 1
      continue
    }

    // 2. Handle Shortcodes {{< ... >}}
    // Convert to leaf directive: ::shortcode{raw="inner content"}
    if (options.enableShortcodes) {
      const shortcodeMatch = line.match(/^(\s*)\{\{< (.+) >\}\}(\s*)$/)
      if (shortcodeMatch) {
        // Check protection
        const matchIndex = line.indexOf('{{<')
        const absoluteMatchIndex = currentOffset + matchIndex

        if (!isProtected(absoluteMatchIndex, protectedRanges)) {
          const [, indent, content, trailing] = shortcodeMatch
          // Escape quotes in content
          const safeContent = content.replace(/"/g, '\\"')
          result.push(`${indent}::shortcode{raw="${safeContent}"}${trailing}`)
          currentOffset += line.length + 1
          continue
        }
      }
    }

    // 3. Existing Div Logic (Preserved)
    // Div fences ":::" are tricky because they look like code blocks.
    // However, in standard markdown, ":::" is text (paragraph).
    // So getProtectedRanges WILL NOT mark ::: as code unless it's inside a code block.
    // So we can safely process them checking isProtected.

    // Check closing fence FIRST (must be standalone, just colons)
    // Match closing fence: ::: (must be standalone)
    const closeMatch = line.match(/^(:{3,})\s*$/)
    if (closeMatch) {
      const matchIndex = line.indexOf(closeMatch[1])
      if (!isProtected(currentOffset + matchIndex, protectedRanges)) {
        const colons = closeMatch[1]

        // Only process standard ::: fences
        if (colons === ':::') {
          // Pop from stack and use that colon count
          const colonCount = divStack.pop() || 3
          result.push(':'.repeat(colonCount))
          currentOffset += line.length + 1
          continue
        }
      }
    }

    // Match opening fence: ::: optionally followed by name and/or {attributes}
    const openMatch = line.match(/^(:{3,})\s*(\w[\w-]*)?\s*(\{[^}]+\})?/)
    if (openMatch) {
      const matchIndex = line.indexOf(openMatch[1])
      if (!isProtected(currentOffset + matchIndex, protectedRanges)) {
        const [, colons, name, attrs] = openMatch

        // Only process standard ::: fences, not longer ones
        if (colons === ':::') {
          // Determine colon count based on nesting depth
          // IMPORTANT: Use MORE colons for OUTER divs to ensure proper nesting
          // micromark requires outer fences to be longer than inner ones
          // Use decreasing colons: outer=5, inner=4, deeper=3
          const depth = divStack.length
          const colonCount = Math.max(3, 5 - depth) // 5 for depth 0, 4 for depth 1, 3 for depth 2+
          const fenceColons = ':'.repeat(colonCount)

          // Push current depth to stack
          divStack.push(colonCount)

          // Build the directive line
          const directiveName = name || 'div'
          let directiveLine = `${fenceColons}${directiveName}`

          if (attrs) {
            // Remove outer braces from captured group
            const attrContent = attrs.slice(1, -1).trim()
            directiveLine += `{${attrContent}}`
          }

          result.push(directiveLine)
          currentOffset += line.length + 1
          continue
        }
      }
    }

    // Regular line, keep as-is
    result.push(line)
    currentOffset += line.length + 1
  }

  // Close any dangling blocks (shouldn't happen in valid docs)
  if (insideMathBlock) {
    // Dump buffer if not closed (fallback)
    result.push('$$', ...mathBuffer)
  }

  return result.join('\n')
}

/**
 * Post-process CommonMark directive syntax back to Pandoc syntax
 * This normalizes all fences back to ::: regardless of nesting
 */
export function postprocessPandocSyntax(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []

  for (const line of lines) {
    // Match opening directive fence with 4+ colons
    const openMatch = line.match(/^(:{4,})(\w[\w-]*)(\{[^}]+\})?/)
    if (openMatch) {
      const [, , name, attrs] = openMatch

      // Convert back to Pandoc syntax
      if (name === 'div' || name === 'qmd') {
        // Generic div, use Pandoc syntax with attributes
        if (attrs) {
          result.push(`::: ${attrs}`)
        }
        else {
          result.push(':::')
        }
      }
      else {
        // Named directive, keep name
        result.push(`::: ${name}${attrs || ''}`)
      }
      continue
    }

    // Match closing fence with 4+ colons
    const closeMatch = line.match(/^:{4,}\s*$/)
    if (closeMatch) {
      result.push(':::')
      continue
    }

    // Regular line
    result.push(line)
  }

  return result.join('\n')
}
