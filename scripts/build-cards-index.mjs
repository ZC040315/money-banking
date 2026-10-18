// 扫描 data/cards-extra/chNN.js，生成 _index.js（幂等）
import { readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '..', 'data', 'cards-extra')

const files = readdirSync(dir)
  .filter((name) => /^ch\d+\.js$/.test(name))
  .sort((a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10))

const imports = files
  .map((name) => `import { extraCards as ch${parseInt(name.slice(2), 10)} } from './${name}'`)
  .join('\n')

const entries = files.map((name) => `  ch${parseInt(name.slice(2), 10)},`).join('\n')

writeFileSync(
  join(dir, '_index.js'),
  `// 由 scripts/build-cards-index.mjs 自动生成，请勿手改
${imports}

export const extraCards = {
${entries}
}
`,
  'utf8',
)

console.log(`cards _index.js rebuilt: ${files.length} chapter file(s)`)
