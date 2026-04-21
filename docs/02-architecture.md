# Phase 2: Architecture — MyThinkRead 云阅读器

## 1. 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                        │
│  │   Web App    │  │   Mobile     │  │  Third-Party │                        │
│  │  (React)     │  │   (V2)       │  │    Apps      │                        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                        │
└─────────┼─────────────────┼─────────────────┼───────────────────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼─────────────────────────────────────────────────┐
│                         边缘层 (Cloudflare Edge)                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Cloudflare Workers                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  API Router │  │  Auth       │  │  Book       │  │  Social    │  │   │
│  │  │             │  │  Service    │  │  Service    │  │  Service   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  AI         │  │  Upload     │  │  Export     │  │  Audio     │  │   │
│  │  │  Service    │  │  Service    │  │  Service    │  │  Service   │  │   │
│  │  │  (文本生成)  │  │             │  │             │  │  (TTS/音频) │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  Kami       │  │  Collaborate│  │  Blog       │  ← V2 扩展      │   │
│  │  │  Render     │  │  Service    │  │  Service    │                  │   │
│  │  │  (美学呈现)  │  │  (协作编辑)  │  │  (读书GitHub)│                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Cloudflare AI Gateway                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │ Workers AI  │  │ ElevenLabs  │  │ Vectorize   │  ← V2 多模态    │   │
│  │  │ (边缘TTS)   │  │ (工作室TTS) │  │ (全书记忆)  │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │         (书摘总结 / 智能推荐 / 内容审核 / 读后感生成 / 音频生成)       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ Internal API
┌─────────▼───────────────────────────────────────────────────────────────────┐
│                        数据层 (Data Layer)                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Cloudflare   │  │ Cloudflare   │  │ Cloudflare   │  │ Cloudflare   │    │
│  │ R2           │  │ D1           │  │ KV           │  │ Queue        │    │
│  │ (书籍文件/   │  │ (用户/书籍/  │  │ (阅读进度/   │  │ (异步任务:   │    │
│  │  封面/静态   │  │  社交关系/   │  │  缓存/会话)   │  │  IPFS上传/   │    │
│  │  资源)       │  │  评论/榜单)   │  │              │  │  AI处理)     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ IPFS Pin / IPFS Gateway
┌─────────▼───────────────────────────────────────────────────────────────────┐
│                      去中心化存储层 (Decentralized Storage)                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  热存储层 (Hot) — IPFS + Cloudflare Gateway                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  Self-Hosted│  │  Pinata/    │  │  Cloudflare IPFS Gateway    │  │   │
│  │  │  IPFS Node  │  │  Web3.Storage│  │  (缓存/加速访问)             │  │   │
│  │  │  (主节点)    │  │  (备份节点)  │  │                             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  冷存储层 (Cold/Permanent) — Arweave                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐                                    │   │
│  │  │  Arweave    │  │  Bundlr/    │  ← 一次付费，永久存储               │   │
│  │  │  Network    │  │  Irys       │    每 GB ~7-9 USD                  │   │
│  │  │             │  │  (批量上传)  │                                    │   │
│  │  └─────────────┘  └─────────────┘                                    │   │
│  │                                                                       │   │
│  │  存储策略:                                                             │   │
│  │  - 新书/热读:  IPFS (快速访问) + Arweave (永久备份)                    │   │
│  │  - 正式发布后: 自动归档到 Arweave，IPFS 作为缓存                       │   │
│  │  - 单本书成本: ~0.01-0.22 USD (1-20MB)                                │   │
│  │                                                                       │   │
│  │  书籍内容存储格式:                                                     │   │
│  │  - 章节内容: JSON → IPFS (hot CID) + Arweave (permanent tx)           │   │
│  │  - 封面图片: PNG/JPG → IPFS (hot CID) + Arweave (permanent tx)        │   │
│  │  - 完整书籍: 打包 → Arweave (主存储) + IPFS (缓存加速)                 │   │
│  │                                                                       │   │
│  │  V2 音频存储格式:                                                      │   │
│  │  - 章节音频: MP3/M4A → IPFS (hot CID) + Arweave (permanent tx)        │   │
│  │  - 音频元数据: JSON (角色声/音效/时长) → 随文本一起存储                  │   │
│  │  - 全书记忆: Vectorize 向量索引 → 角色设定/情节摘要 RAG                 │   │
│  │  - Kami 呈现: 暖米纸底 + 油墨蓝点缀 + serif 权威字体                   │   │
│  │    → One-Pager 导读 / Portfolio / PDF 导出 / 书摘卡片                  │   │
│  │  - 协作编辑: OT 操作转换 + Durable Objects 实时同步                    │   │
│  │  - 读书 GitHub: 评论/批注/AI 总结 → 自动生成个人博客                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ (V2 扩展预留)
┌─────────▼───────────────────────────────────────────────────────────────────┐
│                      知识层 (Knowledge Layer) — V3 预留                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      LLM Wiki Engine                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │ Wiki        │  │ Vectorize   │  │ Obsidian    │  ← V3 知识宇宙   │   │
│  │  │ Compiler    │  │ (RAG)       │  │ Export      │                  │   │
│  │  │ (LLM)       │  │             │  │             │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │                                                                       │   │
│  │  Wiki 结构:                                                            │   │
│  │  - raw/          ← 原始 EPUB 文本                                     │   │
│  │  - concepts/     ← 核心概念解释页                                     │   │
│  │  - entities/     ← 人物/地点/组织实体卡                               │   │
│  │  - themes/       ← 主题脉络分析                                       │   │
│  │  - timeline/     ← 情节时间线                                         │   │
│  │  - foreshadowing/← 伏笔与呼应                                         │   │
│  │  - worldbuilding/← 世界观 Bible                                      │   │
│  │  - analyses/     ← 读者批注洞见（个人/社区）                           │   │
│  │                                                                       │   │
│  │  存储: 打包 → Arweave (永久) + IPFS (热访问)                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ (V2 扩展预留)
┌─────────▼───────────────────────────────────────────────────────────────────┐
│                      区块链层 (Blockchain Layer) — V2 预留                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Solana Program                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  NFT        │  │  Token      │  │  Tipping    │  │              │   │
│  │  │  Collection │  │  Contract   │  │  Contract   │  │              │   │
│  │  │  (藏书票)    │  │  (激励代币)  │  │  (打赏作者)  │  │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. 技术栈选型

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| 前端 | React 19 + Vite + Tailwind CSS | 现代、快速、生态成熟 |
| 状态管理 | Zustand | 轻量、TypeScript 友好 |
| 路由 | React Router v7 | 声明式、数据加载 |
| 富文本编辑 | TipTap / Slate.js | AI 创作内容编辑 |
| EPUB 渲染 | epub.js | 成熟的开源 EPUB 渲染库 |
| 后端 | Cloudflare Workers (Hono) | 边缘计算、低延迟、与 CF 生态集成 |
| 数据库 | Cloudflare D1 (SQLite) | 边缘 SQLite、与 Workers 原生集成 |
| 对象存储 | Cloudflare R2 | S3 兼容、零出口费 |
| 缓存 | Cloudflare KV | 键值缓存、全球边缘 |
| 队列 | Cloudflare Queue | 异步任务解耦 |
| AI 文本 | Cloudflare AI (Workers AI) | 内置模型、边缘推理 |
| AI 音频 | ElevenLabs API + Workers AI TTS | 工作室级声音 + 边缘低延迟 |
| AI 网关 | Cloudflare AI Gateway | 统一管理多模型、缓存限流 |
| 向量记忆 | Cloudflare Vectorize | 全书记忆 RAG，避免角色崩坏 |
| 去中心化存储 | IPFS + Arweave | 热数据 IPFS 缓存，冷数据 Arweave 永久存储 |
| 美学呈现 | Kami Design System | 暖米纸底 + 油墨蓝点缀 + serif 权威字体，One-Pager/Portfolio/PDF 一键生成 |
| 协作编辑 | OT + Cloudflare Durable Objects | 实时多人协作编辑，操作历史版本控制 |
| 个人博客 | Blog Service | 读书 GitHub — 评论/批注/AI 总结自动生成博客 |
| 美学呈现 | Kami Design System | 暖米纸底 + 油墨蓝点缀 + serif 权威字体，One-Pager/Portfolio/PDF 一键生成 |
| 协作编辑 | OT + Cloudflare Durable Objects | 实时多人协作编辑，操作历史版本控制 |
| 个人博客 | Blog Service | 读书 GitHub — 评论/批注/AI 总结自动生成博客 |
| 部署 | Cloudflare Pages | 前端托管、CI/CD |

## 3. 数据流设计

### 3.1 AI 创作与发布流程

```
创作者输入 Prompt / 大纲
    │
    ▼
┌─────────────────┐
│ AI 生成内容      │ ← Cloudflare AI 根据 Prompt 生成章节内容
│ (章节级生成)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 人机协作编辑     │ ← 创作者在线编辑、润色、调整
│ (富文本编辑器)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI 生成封面      │ ← Cloudflare AI 根据内容生成封面图
│ (可选)           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 内容结构化       │ ← 解析为 JSON 章节结构
│ (前端/Worker)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 发布确认         │────▶│ 异步处理 Worker  │
│ (创作者确认发布)  │     │ (Queue 入队)    │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
               ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐
               │ 内容    │  │ 封面    │  │ IPFS   │  │ Arweave  │
               │ 转 JSON │  │ 转存    │  │ Pin    │  │ 永久存储 │
               │ 结构化  │  │ R2      │  │ 上链   │  │ 上链     │
               └───┬────┘  └───┬────┘  └───┬────┘  └────┬─────┘
                   │           │           │            │
                   └───────────┴───────────┴────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │ 更新 D1      │ ← 书籍元数据 + CID/Arweave tx 记录
                        │ 元数据表     │
                        └─────────────┘
```

### 3.2 阅读流程

```
读者打开书籍
    │
    ▼
┌─────────────┐
│ 查询 D1      │ ← 获取书籍元数据 + 结构化 CID
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ KV 查缓存    │ ← 检查 Cloudflare KV 是否缓存了书籍结构
└──────┬──────┘
       │
   ┌───┴───┐
   │ 命中   │      │ 未命中
   ▼       │      ▼
┌──────┐   │  ┌─────────────┐
│ 返回  │   │  │ IPFS Gateway│ ← 通过 Cloudflare IPFS Gateway 获取
│ 缓存  │   │  │ 获取内容    │
└──┬───┘   │  └──────┬──────┘
   │       │         │
   │       │         ▼
   │       │    ┌─────────────┐
   │       │    │ 写入 KV     │ ← 缓存 7 天
   │       │    │ 缓存        │
   │       │    └──────┬──────┘
   │       │           │
   └───────┴───────────┘
                       │
                       ▼
                ┌─────────────┐
                │ 前端渲染    │ ← epub.js 渲染章节内容
                │ 阅读进度    │ ← 实时保存到 KV
                └─────────────┘
```

### 3.3 社交互动流程

```
用户发表书评/批注
    │
    ▼
┌─────────────┐
│ AI 内容审核  │ ← Cloudflare AI 检测违规内容
└──────┬──────┘
       │
   ┌───┴───┐
   │ 通过   │      │ 拒绝
   ▼       │      ▼
┌──────┐   │  ┌─────────────┐
│ 写入  │   │  │ 返回错误    │
│ D1    │   │  │ 提示违规    │
└──┬───┘   │  └─────────────┘
   │       │
   │       │
   ▼       │
┌─────────────┐
│ 更新 Feed   │ ← 写入用户动态表，粉丝可见
│ 缓存失效    │ ← 使相关 KV 缓存失效
└─────────────┘
```

## 4. 数据库 Schema 概览

### 4.1 D1 核心表

```sql
-- 用户表
users (id, username, email, wallet_address_v2, avatar_cid, created_at)

-- 创作者表
creators (id, user_id, display_name, bio, verified, created_at)

-- 书籍表
books (id, creator_id, title, author, description, cover_cid, 
       content_cid, structured_cid, format, status, tags, 
       word_count, chapter_count, created_at, published_at)

-- 章节表
chapters (id, book_id, index, title, content_cid, word_count)

-- 阅读进度表
reading_progress (id, user_id, book_id, chapter_id, position, 
                  percent, updated_at)

-- 批注表
annotations (id, user_id, book_id, chapter_id, range_start, 
             range_end, text, note, color, created_at)

-- 评论表
comments (id, user_id, book_id, chapter_id, parent_id, 
          content, likes, created_at)

-- 书单表
booklists (id, user_id, title, description, tags, created_at)

-- 书单书籍关联表
booklist_items (id, booklist_id, book_id, index, added_at)

-- 用户关注表
follows (id, follower_id, following_id, created_at)

-- 动态表
activities (id, user_id, type, book_id, annotation_id, 
            comment_id, content, created_at)

-- 榜单表
rankings (id, type, book_id, score, period, updated_at)

-- 公版书表
public_domain_books (id, title, author, description, cover_cid, content_cid, 
                     source, source_url, language, publish_year, category, 
                     tags, word_count, chapter_count, status, imported_at)

-- 用户博客文章表
user_blog_posts (id, user_id, type, title, content, source_book_id, 
                 source_chapter_id, source_comment_id, source_annotation_id,
                 is_public, likes, tags, created_at, updated_at)

-- 用户博客配置表
user_blog_configs (id, user_id, subdomain, custom_domain, theme, title, 
                   description, avatar_cid, social_links, is_public,
                   auto_publish_comment, auto_publish_annotation, 
                   auto_publish_ai_summary, created_at, updated_at)

-- 协作文档表
collaborative_docs (id, book_id, chapter_id, title, content, version, 
                    created_by, status, created_at, updated_at)

-- 文档操作历史表
doc_operations (id, doc_id, user_id, operation, position, content, 
                version, timestamp)

-- 文档协作者表
doc_collaborators (id, doc_id, user_id, role, joined_at)

-- TTS 音频缓存表
tts_audio_cache (id, book_id, chapter_id, voice_id, text_hash, 
                 audio_cid, audio_url, duration, status, created_at, completed_at)
```

### 4.2 KV 键设计

```
book:content:{cid}       → 书籍结构化内容缓存 (TTL: 7d)
book:popular:{period}    → 热门榜单缓存 (TTL: 1h)
user:progress:{uid}:{bid} → 用户阅读进度 (TTL: 30d)
user:session:{token}     → 用户会话 (TTL: 7d)
feed:user:{uid}          → 用户信息流 (TTL: 1h)
```

## 5. API 设计概览

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/books              → 书籍列表（支持搜索/筛选/分页）
POST   /api/books              → 创建书籍（创作者）
GET    /api/books/:id          → 书籍详情
GET    /api/books/:id/content  → 获取书籍内容（章节列表）
GET    /api/books/:id/read     → 阅读章节内容
PUT    /api/books/:id          → 更新书籍信息
DELETE /api/books/:id          → 下架书籍

POST   /api/ai/generate        → AI 生成章节内容
POST   /api/ai/continue        → AI 续写内容
POST   /api/ai/rewrite         → AI 改写内容
POST   /api/ai/cover           → AI 生成封面
POST   /api/books/:id/publish  → 发布书籍（触发异步处理）

GET    /api/rankings/:type     → 获取榜单

POST   /api/annotations        → 创建批注
GET    /api/annotations        → 获取批注列表
DELETE /api/annotations/:id    → 删除批注

POST   /api/comments           → 发表评论
GET    /api/comments           → 获取评论列表
POST   /api/comments/:id/like  → 点赞评论

POST   /api/booklists          → 创建书单
GET    /api/booklists          → 书单列表
GET    /api/booklists/:id      → 书单详情

POST   /api/follows            → 关注用户
DELETE /api/follows/:id        → 取消关注

GET    /api/feed               → 获取信息流
GET    /api/activities         → 获取用户动态

GET    /api/export/reading     → 导出阅读数据
GET    /api/export/annotations → 导出批注数据
GET    /api/export/all         → 导出全部数据

POST   /api/ai/summarize       → AI 书摘总结
POST   /api/ai/recommend       → AI 书籍推荐

# V2 音频 API
POST   /api/audio/generate     → 生成章节音频 (ElevenLabs/Workers AI)
GET    /api/audio/:chapter_id  → 获取章节音频
POST   /api/audio/book         → 一键生成全书音频
GET    /api/audio/status/:id   → 查询音频生成进度

# V2 Kami 呈现 API
POST   /api/kami/one-pager     → 生成 One-Pager 导读 (Kami 风格)
POST   /api/kami/portfolio     → 生成作品集 Portfolio (Kami 风格)
POST   /api/kami/pdf           → 导出章节 PDF (Kami 风格)
GET    /api/kami/card/:id      → 获取书摘卡片 (Kami 风格)

# V2 协作编辑 API
GET    /api/collaborate/docs/:bookId  → 列出协作文档
POST   /api/collaborate/docs          → 创建协作文档
GET    /api/collaborate/docs/:docId   → 获取文档详情
POST   /api/collaborate/docs/:docId/operations  → 提交编辑操作
GET    /api/collaborate/docs/:docId/operations  → 获取操作历史
POST   /api/collaborate/docs/:docId/collaborators → 添加协作者

# V2 个人博客 API
GET    /api/blog/config       → 获取博客配置
PUT    /api/blog/config       → 更新博客配置
GET    /api/blog/posts        → 获取博客文章列表
POST   /api/blog/posts        → 创建博客文章
GET    /api/blog/:subdomain   → 获取公开博客内容
POST   /api/blog/generate     → AI 自动生成博客文章
```

## 6. 安全设计

| 层面 | 措施 |
|------|------|
| 认证 | JWT Token，存储于 httpOnly cookie |
| 授权 | RBAC（读者/创作者/管理员） |
| 上传 | 文件类型校验、大小限制、病毒扫描（V2） |
| 内容 | AI 审核 + 人工举报机制 |
| API | Rate Limiting（Cloudflare 原生支持） |
| CORS | 严格限制来源 |

## 7. 扩展预留（V2 / V3）

| 功能 | 预留点 | 版本 |
|------|--------|------|
| Solana 钱包 | users.wallet_address_v2 字段 | V2 |
| NFT 藏书票 | 书籍表预留 nft_collection 字段 | V2 |
| 代币激励 | 独立积分表，未来可映射到链上代币 | V2 |
| 有声书 | books 表预留 audio_cid 字段 | V2 |
| 音频存储 | chapters 表预留 audio_arweave_tx 字段 | V2 |
| 角色声音 | 独立 voice_profiles 表 | V2 |
| 全书记忆 | Vectorize 索引预留 | V2 |
| PWA 离线 | Service Worker 架构预留 | V2 |
| Kami 呈现 | 前端 Kami Design System 组件库 | V2 |
| 协作编辑 | Durable Objects + OT 协议预留 | V2 |
| 个人博客 | Blog Service + 独立 subdomain 路由 | V2 |
| **LLM Wiki** | **books 表预留 wiki_cid / wiki_arweave_tx 字段** | **V3** |
| **Wiki 编译** | **独立 wiki_compilations 表** | **V3** |
| **Obsidian 导出** | **前端 Markdown 打包工具** | **V3** |
| **知识图谱** | **entities / concepts 独立表 + 关系边表** | **V3** |
| **动态 Kami 主题** | **根据书籍类型自动切换配色和字体** | **V3** |

## 8. 验收标准

- [ ] 架构图覆盖所有核心功能模块
- [ ] 数据流清晰定义上传/阅读/社交三大流程
- [ ] 数据库 Schema 支持 MVP 所有功能
- [ ] API 设计完整覆盖 PRD 功能点
- [ ] 安全设计覆盖认证/授权/内容审核
- [ ] V2/V3 扩展点已预留，不影响当前架构
