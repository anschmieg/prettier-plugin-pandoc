import type { Parser } from 'prettier'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { ASTNode } from './ast'
import { astFormat } from './ast'

// Pandoc extensions
import {
  citationExtension,
  citationFromMarkdownExtension,
  definitionListExtension,
  definitionListFromMarkdownExtension,
  directiveExtension,
  directiveFromMarkdownExtension,
  frontmatterExtension,
  frontmatterFromMarkdownExtension,
  gfmExtension,
  gfmFromMarkdownExtension,
  mathExtension,
  mathFromMarkdownExtension,
} from './pandoc'
import { preprocessPandocSyntax } from './pandoc/preprocess'

// Shared configuration
const extensions = [
  directiveExtension(),
  mathExtension(),
  frontmatterExtension,
  gfmExtension(),
  definitionListExtension, // Definition Lists
  citationExtension({}), // Citations
]

const mdastExtensions = [
  directiveFromMarkdownExtension(),
  mathFromMarkdownExtension(),
  frontmatterFromMarkdownExtension,
  gfmFromMarkdownExtension(),
  definitionListFromMarkdownExtension,
  citationFromMarkdownExtension,
]

// Base helpers
const locStart = (node: any) => node.position?.start.offset ?? 0
const locEnd = (node: any) => node.position?.end.offset ?? 0

// 1. Pandoc Parser (Standard extensions, NO Shortcodes)
export const pandocParser: Parser<ASTNode> = {
  astFormat,
  locStart,
  locEnd,
  async parse(text: string) {
    // enableShortcodes: false ensures {{< >}} are treated as plain text
    // enableMathLabels: false ensures $$ {#label} is not processed (not standard Pandoc)
    const preprocessed = preprocessPandocSyntax(text, {
      enableShortcodes: false,
      enableMathLabels: false,
    })

    const tree = fromMarkdown(preprocessed, {
      extensions,
      mdastExtensions,
    })

    return tree
  },
}

// 2. Quarto Parser (Pandoc + Shortcodes)
export const quartoParser: Parser<ASTNode> = {
  astFormat,
  locStart,
  locEnd,
  async parse(text: string) {
    // enableShortcodes: true converts {{< >}} to ::shortcode directives
    // enableMathLabels: true converts $$ {#label} to :::math{#label} (Quarto-specific)
    const preprocessed = preprocessPandocSyntax(text, {
      enableShortcodes: true,
      enableMathLabels: true,
    })

    const tree = fromMarkdown(preprocessed, {
      extensions,
      mdastExtensions,
    })

    return tree
  },
}

// Default export for backward compatibility
export const parser = quartoParser
