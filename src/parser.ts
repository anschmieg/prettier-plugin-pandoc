import type { Parser } from 'prettier'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { ASTNode } from './ast'
import { astFormat } from './ast'

export const parser: Parser<ASTNode> = {
  astFormat,
  locStart(node: any) {
    return node.position?.start.offset ?? 0
  },
  locEnd(node: any) {
    return node.position?.end.offset ?? 0
  },
  async parse(text: string) {
    // Parse markdown without special extensions
    // This will treat Quarto divs as plain text, which we'll preserve as-is
    const tree = fromMarkdown(text)

    return tree
  },
}
