import { JSDOM } from 'jsdom'

export function installDomParser(): void {
  if (typeof globalThis.DOMParser === 'undefined') {
    globalThis.DOMParser = new JSDOM('').window.DOMParser
  }
}
