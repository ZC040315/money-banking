// 扫描 data/extra/chNN.js，生成 _index.js（幂等，随时可重跑）
import { readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const extraDir = join(here, '..', 'data', 'extra')

const files = readdirSync(extraDir)
  .filter((name) => /^ch\d+\.js$/.test(name))
  .sort((a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10))

const imports = files
  .map((name) => {
    const key = `ch${parseInt(name.slice(2), 10)}`
    return `import { extra as ${key} } from './${name}'`
  })
  .join('\n')

const entries = files
  .map((name) => {
    const key = `ch${parseInt(name.slice(2), 10)}`
    return `  ${key},`
  })
  .join('\n')

const content = `// 由 scripts/build-extra-index.mjs 自动生成，请勿手改
${imports}

export const extraQuestions = {
${entries}
}
`

writeFileSync(join(extraDir, '_index.js'), content, 'utf8')
console.log(`_index.js rebuilt: ${files.length} chapter file(s)`)
