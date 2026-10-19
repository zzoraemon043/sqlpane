import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy } from './contentSecurityPolicy'
import { buildVersion, listFiles, selectPrecacheFiles } from './serviceWorkerPlugin'

function sampleOutput() {
  const directory = mkdtempSync(join(tmpdir(), 'sqlpane-sw-'))
  mkdirSync(join(directory, 'assets'))
  writeFileSync(join(directory, 'index.html'), '<html></html>')
  writeFileSync(join(directory, 'assets', 'app.js'), 'console.log(1)')
  writeFileSync(join(directory, 'assets', 'app.js.map'), '{}')
  writeFileSync(join(directory, 'assets', 'engine.wasm'), Buffer.alloc(6 * 1024 * 1024))
  writeFileSync(join(directory, 'sw.js'), 'old')
  return directory
}

describe('service worker build', () => {
  it('precaches small files and leaves large engines to runtime caching', () => {
    const directory = sampleOutput()
    expect(selectPrecacheFiles(directory, listFiles(directory))).toEqual(['assets/app.js', 'index.html'])
  })

  it('changes the version when any file changes', () => {
    const directory = sampleOutput()
    const before = buildVersion(directory, listFiles(directory))
    writeFileSync(join(directory, 'index.html'), '<html>changed</html>')
    expect(buildVersion(directory, listFiles(directory))).not.toBe(before)
  })

  it('only allows the site itself in the content security policy', () => {
    expect(contentSecurityPolicy).toContain("default-src 'self'")
    expect(contentSecurityPolicy).toContain("connect-src 'self'")
    expect(contentSecurityPolicy).not.toMatch(/https?:/)
    expect(contentSecurityPolicy).not.toContain("'unsafe-eval'")
  })
})
