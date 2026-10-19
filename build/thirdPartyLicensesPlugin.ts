import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

const licenseFilePattern = /^(licen[cs]e|notice|copying)(\.(md|txt))?$/i
export const licensesFileName = 'third-party-licenses.txt'

export function packageRootOf(moduleId: string): string | undefined {
  const normalized = moduleId.replace(/\\/g, '/')
  const match = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(normalized)
  return match?.[1]
}

export function licenseSection(packageRoot: string): string {
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as { name: string; version: string; license?: string }
  const texts = readdirSync(packageRoot)
    .filter((file) => licenseFilePattern.test(file))
    .sort()
    .map((file) => readFileSync(join(packageRoot, file), 'utf8').trim())
  const header = `${manifest.name} ${manifest.version} (${manifest.license ?? 'see license text'})`
  return [header, '='.repeat(header.length), ...texts].join('\n\n')
}

export function thirdPartyLicensesPlugin(extraPackages: string[] = []): Plugin {
  let projectRoot = process.cwd()
  return {
    name: 'sqlpane-third-party-licenses',
    apply: 'build',
    configResolved(config) {
      projectRoot = config.root
    },
    generateBundle(_options, bundle) {
      const roots = new Set<string>()
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        for (const moduleId of Object.keys(output.modules)) {
          const root = packageRootOf(moduleId)
          if (root && existsSync(join(root, 'package.json'))) roots.add(root)
        }
      }
      for (const name of extraPackages) roots.add(join(projectRoot, 'node_modules', name).replace(/\\/g, '/'))
      const sections = [...roots].sort((left, right) => left.localeCompare(right)).map(licenseSection)
      this.emitFile({ type: 'asset', fileName: licensesFileName, source: `${sections.join('\n\n\n')}\n` })
    },
  }
}
