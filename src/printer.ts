import type { AstPath, Printer } from 'prettier'
import type * as Mdast from 'mdast'
import { toMarkdown } from 'mdast-util-to-markdown'
import type { ASTNode } from './ast'

// Import toMarkdown extensions
import {
  citationToMarkdownExtension,
  definitionListToMarkdownExtension,
  directiveToMarkdownExtension,
  frontmatterToMarkdownExtension,
  gfmToMarkdownExtension,
  mathToMarkdownExtension,
} from './pandoc'

export const printer: Printer<ASTNode> = {
  print(path: AstPath<ASTNode>) {
    const node = path.getNode()

    if (!node) {
      return ''
    }

    // For the root node, convert to markdown with all extensions
    if (node.type === 'root') {
      // Get the base directive extension
      const directiveExt = directiveToMarkdownExtension()

      // Wrap the containerDirective handler to output Pandoc syntax
      const customDirectiveExt = {
        ...directiveExt,
        handlers: {
          ...directiveExt.handlers,
          containerDirective(node: any, _parent: any, state: any, info: any) {
            // SPECIAL: Handle preprocessed Math blocks
            if (node.name === 'math') {
              const content = state.containerFlow(node, info)
              // Reconstruct attributes: {#eq-label .class key="val"}
              const attrs: string[] = []

              if (node.attributes) {
                if (node.attributes.id) {
                  attrs.push(`#${node.attributes.id}`)
                }

                if (node.attributes.class) {
                  const classes = node.attributes.class.split(' ')
                  classes.forEach((c: string) => attrs.push(`.${c}`))
                }

                for (const [key, value] of Object.entries(node.attributes)) {
                  if (key !== 'class' && key !== 'id') {
                    attrs.push(`${key}="${value}"`)
                  }
                }
              }

              const attrStr = attrs.length > 0 ? ` {${attrs.join(' ')}}` : ''
              return `$$\n${content.trim()}\n$$${attrStr}`
            }

            // Always output Pandoc fenced div syntax (with :::, not longer fences)
            // Build attribute string
            const attrs: string[] = []
            if (node.attributes) {
              if (node.attributes.class) {
                // Handle multiple classes? micromark puts them in 'class' attribute string separated by space?
                // Actually mdast-util-directive puts them in node.attributes.class
                const classes = node.attributes.class.split(' ')
                classes.forEach((c: string) => attrs.push(`.${c}`))
              }
              if (node.attributes.id) {
                attrs.push(`#${node.attributes.id}`)
              }
              // Add other attributes
              for (const [key, value] of Object.entries(node.attributes)) {
                if (key !== 'class' && key !== 'id') {
                  attrs.push(`${key}="${value}"`)
                }
              }
            }

            // Format children
            const content = state.containerFlow(node, info)

            // Determine header based on directive name and attributes
            let header = ':::'
            if (node.name && node.name !== 'div') {
              // Named directive (uncommon in Pandoc)
              if (attrs.length > 0) {
                header = `::: ${node.name} {${attrs.join(' ')}}`
              }
              else {
                header = `::: ${node.name}`
              }
            }
            else if (attrs.length > 0) {
              // Div with attributes (standard Pandoc)
              header = `::: {${attrs.join(' ')}}`
            }

            // Ensure content ends with newline before closing fence
            const trimmedContent = content.trim()
            return `${header}\n${trimmedContent}\n:::`
          },
          leafDirective(node: any, _parent: any, state: any, info: any) {
            // SPECIAL: Handle preprocessed Shortcodes
            if (node.name === 'shortcode') {
              if (node.attributes && node.attributes.raw) {
                return `{{< ${node.attributes.raw} >}}`
              }
            }
            // Default fallback for other leaf directives
            return state.handle(node, _parent, state, info)
          },
        },
      }

      const markdown = toMarkdown(node as Mdast.Root, {
        extensions: [
          customDirectiveExt,
          mathToMarkdownExtension(),
          frontmatterToMarkdownExtension,
          gfmToMarkdownExtension(),
          citationToMarkdownExtension(),
          definitionListToMarkdownExtension,
        ],
      })
      return markdown
    }

    return ''
  },

  embed() {
    // No embed support for now - keep it simple
    return null
  },
}
