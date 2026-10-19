import { describe, expect, it } from 'vitest'
import { en } from './en'
import { initialLocale, localeFromLanguages, messagesFor, readStoredLocale, storeLocale } from './locale'
import { zhTW } from './zhTW'

const memoryStorage = () => {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value) }
}

describe('locale', () => {
  it('follows the browser language', () => {
    expect(localeFromLanguages(['zh-TW', 'en-US'])).toBe('zh-TW')
    expect(localeFromLanguages(['zh-Hant-HK'])).toBe('zh-TW')
    expect(localeFromLanguages(['en-GB', 'zh-TW'])).toBe('en')
    expect(localeFromLanguages(['fr-FR', 'zh-TW'])).toBe('zh-TW')
    expect(localeFromLanguages(['ja-JP'])).toBe('en')
    expect(localeFromLanguages([])).toBe('en')
  })

  it('prefers the language the user picked', () => {
    const storage = memoryStorage()
    storeLocale(storage, 'en')
    expect(initialLocale(storage, ['zh-TW'])).toBe('en')
    expect(initialLocale(memoryStorage(), ['zh-TW'])).toBe('zh-TW')
  })

  it('ignores storage that throws or holds unknown values', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(readStoredLocale(broken)).toBeUndefined()
    expect(() => storeLocale(broken, 'en')).not.toThrow()
    const storage = memoryStorage()
    storage.setItem('sqlpane.locale', 'xx')
    expect(readStoredLocale(storage)).toBeUndefined()
  })

  it('has every message in both languages', () => {
    expect(Object.keys(zhTW).sort()).toEqual(Object.keys(en).sort())
    expect(Object.keys(zhTW.chartKinds).sort()).toEqual(Object.keys(en.chartKinds).sort())
    expect(messagesFor('zh-TW').columnsOf('orders')).toBe('orders 的欄位')
  })

  it('uses Taiwan vocabulary in Chinese', () => {
    const chinese = JSON.stringify(zhTW)
    for (const mainlandTerm of ['文件', '数据', '數據', '默認', '默认', '查询', '信息', '軟件', '用戶', '視頻', '服務器', '導出', '導入', '字段', '程序', '屏幕', '鼠標', '支持', '創建', '保存', '設置', '選擇器']) {
      expect(chinese, mainlandTerm).not.toContain(mainlandTerm)
    }
  })
})
