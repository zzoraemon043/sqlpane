import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { licenseSection, packageRootOf } from './thirdPartyLicensesPlugin'

describe('third-party licenses', () => {
  it('finds the package that a bundled module belongs to', () => {
    expect(packageRootOf('/repo/node_modules/react/index.js')).toBe('/repo/node_modules/react')
    expect(packageRootOf('C:\\repo\\node_modules\\@scope\\pkg\\dist\\a.js')).toBe('C:/repo/node_modules/@scope/pkg')
    expect(packageRootOf('/repo/node_modules/a/node_modules/b/x.js')).toBe('/repo/node_modules/a/node_modules/b')
    expect(packageRootOf('/repo/src/App.tsx')).toBeUndefined()
  })

  it('includes license and notice texts for a package', () => {
    const root = join(mkdtempSync(join(tmpdir(), 'sqlpane-license-')), 'example')
    mkdirSync(root)
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'example', version: '1.2.3', license: 'Apache-2.0' }))
    writeFileSync(join(root, 'LICENSE'), 'License text')
    writeFileSync(join(root, 'NOTICE.txt'), 'Notice text')
    writeFileSync(join(root, 'README.md'), 'Not a license')
    expect(licenseSection(root)).toBe('example 1.2.3 (Apache-2.0)\n\n==========================\n\nLicense text\n\nNotice text')
  })
})
