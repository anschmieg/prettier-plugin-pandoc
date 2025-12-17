import type { Plugin } from 'prettier'
import { astFormat } from './ast'
import { pandocParser, quartoParser } from './parser'
import { printer } from './printer'

export default {
  languages: [
    {
      name: 'Quarto',
      parsers: ['quarto'],
      extensions: ['.qmd'],
      vscodeLanguageIds: ['quarto'],
    },
    {
      name: 'Pandoc',
      parsers: ['pandoc'],
      vscodeLanguageIds: ['markdown'],
    },
  ],
  parsers: {
    quarto: quartoParser,
    pandoc: pandocParser,
  },
  printers: {
    [astFormat]: printer,
  },
} as Plugin
