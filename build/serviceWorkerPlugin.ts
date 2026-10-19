import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { build, type Plugin, type ResolvedConfig } from 'vite'

const precacheSizeLimit = 5 * 1024 * 1024
const serviceWorkerFile = 'sw.js'

export function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

export function selectPrecacheFiles(outDir: string, files: string[]): string[] {
  return files
    .filter((file) => statSync(file).size <= precacheSizeLimit)
    .map((file) => relative(outDir, file).split(sep).join('/'))
    .filter((file) => file !== serviceWorkerFile && !file.endsWith('.map'))
    .sort()
}

export function buildVersion(outDir: string, files: string[]): string {
  const hash = createHash('sha256')
  for (const file of [...files].sort()) {
    hash.update(relative(outDir, file))
    hash.update(readFileSync(file))
  }
  return hash.digest('hex').slice(0, 16)
}

export function serviceWorkerPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'sqlpane-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    async closeBundle() {
      const outDir = resolve(config.root, config.build.outDir)
      const files = listFiles(outDir).filter((file) => !file.endsWith(serviceWorkerFile))
      await build({
        configFile: false,
        logLevel: 'warn',
        define: {
          precacheFiles: JSON.stringify(selectPrecacheFiles(outDir, files)),
          buildVersion: JSON.stringify(buildVersion(outDir, files)),
        },
        build: {
          outDir,
          emptyOutDir: false,
          copyPublicDir: false,
          minify: true,
          lib: { entry: resolve(config.root, 'src/serviceWorker/serviceWorker.ts'), formats: ['iife'], name: 'sqlpaneServiceWorker', fileName: () => serviceWorkerFile },
        },
      })
    },
  }
}
