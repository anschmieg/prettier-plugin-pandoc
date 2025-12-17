/* eslint-disable no-console */
import { fromMarkdown } from 'mdast-util-from-markdown'

const content = `
$$
math
$$ {#eq-label}

::: {.class}
content
:::
`

const tree = fromMarkdown(content)
console.log(JSON.stringify(tree, null, 2))
