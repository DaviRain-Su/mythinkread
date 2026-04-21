import { Hono } from 'hono'
import type { Env } from '../index'

const i18n = new Hono<{ Bindings: Env }>()

// GET /api/i18n/translations/:lang - Get translations
i18n.get('/translations/:lang', async (c) => {
  const lang = c.req.param('lang')
  
  const translations: Record<string, Record<string, string>> = {
    zh: {
      'nav.home': '首页',
      'nav.books': '书库',
      'nav.rankings': '榜单',
      'nav.booklists': '书单',
      'nav.feed': '动态',
      'nav.search': '搜索',
      'nav.create': '创作',
      'nav.profile': '个人中心',
      'nav.login': '登录',
      'nav.register': '注册',
      'nav.logout': '退出',
      'book.read': '开始阅读',
      'book.chapters': '章节列表',
      'book.comments': '评论',
      'book.ratings': '评分',
      'book.rate': '评分',
      'book.write_review': '写下你的书评',
      'book.submit_rating': '提交评分',
      'book.purchased': '已购买',
      'book.buy': '购买',
      'book.free': '免费',
      'search.placeholder': '搜索书名、作者、书单...',
      'search.no_results': '未找到相关结果',
      'feed.title': '动态',
      'feed.empty': '暂无动态，去关注一些用户吧',
      'profile.my_books': '我的作品',
      'profile.reading_progress': '阅读进度',
      'profile.data_export': '数据导出',
      'profile.wallet': '钱包',
      'profile.export_reading': '导出阅读进度',
      'profile.export_all': '导出全部数据',
      'common.loading': '加载中...',
      'common.save': '保存',
      'common.cancel': '取消',
      'common.delete': '删除',
      'common.edit': '编辑',
      'common.create': '创建',
      'common.submit': '提交',
      'common.close': '关闭',
      'notification.title': '通知',
      'notification.empty': '暂无通知',
      'notification.mark_all_read': '全部已读',
      'recommendations.for_you': '为你推荐',
      'recommendations.similar': '相似书籍',
      'recommendations.trending': '热门趋势',
    },
    en: {
      'nav.home': 'Home',
      'nav.books': 'Books',
      'nav.rankings': 'Rankings',
      'nav.booklists': 'Booklists',
      'nav.feed': 'Feed',
      'nav.search': 'Search',
      'nav.create': 'Create',
      'nav.profile': 'Profile',
      'nav.login': 'Login',
      'nav.register': 'Register',
      'nav.logout': 'Logout',
      'book.read': 'Start Reading',
      'book.chapters': 'Chapters',
      'book.comments': 'Comments',
      'book.ratings': 'Ratings',
      'book.rate': 'Rate',
      'book.write_review': 'Write your review',
      'book.submit_rating': 'Submit Rating',
      'book.purchased': 'Purchased',
      'book.buy': 'Buy',
      'book.free': 'Free',
      'search.placeholder': 'Search books, authors, booklists...',
      'search.no_results': 'No results found',
      'feed.title': 'Feed',
      'feed.empty': 'No activities yet, follow some users',
      'profile.my_books': 'My Books',
      'profile.reading_progress': 'Reading Progress',
      'profile.data_export': 'Data Export',
      'profile.wallet': 'Wallet',
      'profile.export_reading': 'Export Reading Progress',
      'profile.export_all': 'Export All Data',
      'common.loading': 'Loading...',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.create': 'Create',
      'common.submit': 'Submit',
      'common.close': 'Close',
      'notification.title': 'Notifications',
      'notification.empty': 'No notifications',
      'notification.mark_all_read': 'Mark all as read',
      'recommendations.for_you': 'For You',
      'recommendations.similar': 'Similar Books',
      'recommendations.trending': 'Trending',
    }
  }

  return c.json({
    lang,
    translations: translations[lang] || translations['zh']
  })
})

// GET /api/i18n/languages - Get supported languages
i18n.get('/languages', async (c) => {
  return c.json({
    languages: [
      { code: 'zh', name: '中文', nativeName: '中文' },
      { code: 'en', name: 'English', nativeName: 'English' }
    ],
    default: 'zh'
  })
})

export default i18n
