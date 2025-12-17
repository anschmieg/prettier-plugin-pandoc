import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { gfm } from 'micromark-extension-gfm'
import { frontmatter } from 'micromark-extension-frontmatter'
import { visit } from 'unist-util-visit'

export type Range = [number, number]

export function getProtectedRanges(text: string): Range[] {
  const ranges: Range[] = []

  // Parse valid structure WITHOUT Math extension
  // This ensures $$ is treated as text, but Code Blocks are identified correctly.
  const tree = fromMarkdown(text, {
    extensions: [gfm(), frontmatter(['yaml'])],
    mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(['yaml'])],
  })

  visit(tree, ['code', 'inlineCode', 'yaml', 'toml', 'json'], (node: any) => {
    if (node.position) {
      ranges.push([node.position.start.offset, node.position.end.offset])
    }
  })

  // Sort ranges by start position
  return ranges.sort((a, b) => a[0] - b[0])
}

export function isProtected(index: number, ranges: Range[]): boolean {
  for (const [start, end] of ranges) {
    if (index >= start && index < end) {
      return true
    }
  }
  return false
}
