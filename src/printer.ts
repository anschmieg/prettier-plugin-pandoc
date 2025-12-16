import type { AstPath, Printer } from 'prettier'
import type * as Mdast from 'mdast'
import { toMarkdown } from 'mdast-util-to-markdown'
import type { ASTNode } from './ast'

export const printer: Printer<ASTNode> = {
  print(path: AstPath<ASTNode>) {
    const node = path.getNode()

    if (!node) {
      return ''
    }

    // For the root node, convert to markdown
    if (node.type === 'root') {
      const markdown = toMarkdown(node as Mdast.Root)
      return markdown
    }

    return ''
  },

  embed() {
    // No embed support for now - keep it simple
    return null
  },
}
