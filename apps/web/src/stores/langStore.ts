import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LangState {
  lang: 'en' | 'zh'
  setLang: (lang: 'en' | 'zh') => void
  toggle: () => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang) => {
        document.documentElement.setAttribute('data-lang', lang)
        set({ lang })
      },
      toggle: () => {
        const next = get().lang === 'en' ? 'zh' : 'en'
        document.documentElement.setAttribute('data-lang', next)
        set({ lang: next })
      },
    }),
    {
      name: 'mtr-lang',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-lang', state.lang)
        }
      },
    }
  )
)

export function T(props: { en: string; zh: string; className?: string; style?: React.CSSProperties }) {
  const { lang } = useLangStore()
  const text = lang === 'zh' ? props.zh : props.en
  return React.createElement('span', { className: props.className, style: props.style }, text)
}

export const STR = {
  topbar: {
    discover: { en: 'Discover', zh: '发现' },
    studio: { en: 'Studio', zh: '写作台' },
    social: { en: 'Club', zh: '书友圈' },
    wiki: { en: 'Wiki', zh: '知识宇宙' },
    data: { en: 'Data', zh: '我的数据' },
    rankings: { en: 'Ranks', zh: '榜单' },
    lists: { en: 'Lists', zh: '书单' },
    feed: { en: 'Feed', zh: '动态' },
    recs: { en: 'For you', zh: '推荐' },
    archive: { en: 'Archive', zh: '公版' },
    dao: { en: 'DAO', zh: '治理' },
  },
  reader: {
    chapter: { en: 'Chapter', zh: '章' },
    beginReading: { en: 'Begin reading', zh: '开始阅读' },
    save: { en: 'Save', zh: '收藏' },
    share: { en: 'Share', zh: '分享' },
    minLeft: { en: 'min left', zh: '分钟剩余' },
    next: { en: 'next', zh: '下一章' },
  },
  studio: {
    compose: { en: 'Compose', zh: '写作' },
    generate: { en: 'AI Generate', zh: '生成' },
    publish: { en: 'Publish', zh: '发布' },
    manuscript: { en: 'Manuscript', zh: '手稿' },
    health: { en: 'Health', zh: '健康度' },
    memory: { en: 'Memory', zh: '记忆' },
  },
  wiki: {
    concepts: { en: 'Concepts', zh: '概念' },
    entities: { en: 'Entities', zh: '实体' },
    themes: { en: 'Themes', zh: '主题' },
    timeline: { en: 'Timeline', zh: '时间线' },
    analyses: { en: 'Analyses', zh: '分析' },
    compiled: { en: 'Compiled', zh: '编译于' },
    lastEdit: { en: 'Last edit', zh: '最后编辑' },
    revision: { en: 'Revision', zh: '版本' },
  },
  common: {
    search: { en: 'Search books, authors, CIDs…', zh: '搜索书籍、作者、CID…' },
    create: { en: 'Create', zh: '创作' },
    signIn: { en: 'Sign in', zh: '登录' },
    join: { en: 'Join', zh: '加入' },
    signOut: { en: 'Sign out', zh: '退出' },
  },
} as const

export function useStr(path: string): string {
  const { lang } = useLangStore()
  const parts = path.split('.')
  let cur: unknown = STR
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return path
    }
  }
  if (cur && typeof cur === 'object' && lang in cur) {
    return (cur as Record<string, string>)[lang]
  }
  if (cur && typeof cur === 'object' && 'en' in cur) {
    return (cur as Record<string, string>).en
  }
  return path
}
