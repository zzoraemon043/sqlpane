import { en, type Messages } from './en'
import { zhTW } from './zhTW'

export type Locale = 'zh-TW' | 'en'

export const locales: { locale: Locale; name: string }[] = [
  { locale: 'zh-TW', name: '繁體中文' },
  { locale: 'en', name: 'English' },
]

const messagesByLocale: Record<Locale, Messages> = { 'zh-TW': zhTW, en }
const storageKey = 'sqlpane.locale'

export function messagesFor(locale: Locale): Messages {
  return messagesByLocale[locale]
}

export function localeFromLanguages(languages: readonly string[]): Locale {
  for (const language of languages) {
    const lower = language.toLowerCase()
    if (lower.startsWith('zh')) return 'zh-TW'
    if (lower.startsWith('en')) return 'en'
  }
  return 'en'
}

export function isLocale(value: unknown): value is Locale {
  return value === 'zh-TW' || value === 'en'
}

export function readStoredLocale(storage: Pick<Storage, 'getItem'> | undefined): Locale | undefined {
  try {
    const value = storage?.getItem(storageKey)
    return isLocale(value) ? value : undefined
  } catch {
    return undefined
  }
}

export function storeLocale(storage: Pick<Storage, 'setItem'> | undefined, locale: Locale): void {
  try {
    storage?.setItem(storageKey, locale)
  } catch {
    return
  }
}

export function initialLocale(storage: Pick<Storage, 'getItem'> | undefined, languages: readonly string[]): Locale {
  return readStoredLocale(storage) ?? localeFromLanguages(languages)
}
