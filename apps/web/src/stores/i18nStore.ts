import { create } from 'zustand'

interface I18nState {
  lang: string
  translations: Record<string, string>
  setLang: (lang: string) => void
  t: (key: string) => string
  loadTranslations: (lang: string) => Promise<void>
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: localStorage.getItem('mtr_lang') || 'zh',
  translations: {},

  setLang: (lang: string) => {
    localStorage.setItem('mtr_lang', lang)
    set({ lang })
    get().loadTranslations(lang)
  },

  t: (key: string) => {
    const { translations } = get()
    return translations[key] || key
  },

  loadTranslations: async (lang: string) => {
    try {
      const res = await fetch(`/api/i18n/translations/${lang}`)
      if (!res.ok) return
      const data = await res.json()
      set({ translations: data.translations || {} })
    } catch (err) {
      console.error('Failed to load translations:', err)
    }
  }
}))
