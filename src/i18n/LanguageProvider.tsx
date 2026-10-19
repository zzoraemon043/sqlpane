import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MessagesContext } from './i18nContext'
import { initialLocale, messagesFor, storeLocale, type Locale } from './locale'
import { LocaleContext } from './localeContext'

const browserStorage = (() => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
})()

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => initialLocale(browserStorage, typeof navigator === 'undefined' ? [] : navigator.languages))

  useEffect(() => {
    document.documentElement.lang = locale
    storeLocale(browserStorage, locale)
  }, [locale])

  const localeValue = useMemo(() => ({ locale, setLocale }), [locale])
  return (
    <LocaleContext.Provider value={localeValue}>
      <MessagesContext.Provider value={messagesFor(locale)}>{children}</MessagesContext.Provider>
    </LocaleContext.Provider>
  )
}
