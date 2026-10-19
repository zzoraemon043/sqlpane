import { useMessages } from './i18nContext'
import { isLocale, locales } from './locale'
import { useLocale } from './localeContext'

export function LanguageSwitch() {
  const text = useMessages()
  const { locale, setLocale } = useLocale()
  return (
    <select
      aria-label={text.language}
      value={locale}
      onChange={(event) => {
        if (isLocale(event.target.value)) setLocale(event.target.value)
      }}
    >
      {locales.map((option) => (
        <option key={option.locale} value={option.locale} lang={option.locale}>
          {option.name}
        </option>
      ))}
    </select>
  )
}
