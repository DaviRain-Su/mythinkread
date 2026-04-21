# Phase 3: Technical Spec — MyThinkRead 云阅读器

## 1. 数据结构精确定义

### 1.1 用户表 (users)

```sql
CREATE TABLE users (
    id              TEXT PRIMARY KEY,           -- UUID v7, 36 chars
    username        TEXT NOT NULL UNIQUE,       -- 3-20 chars, [a-z0-9_]
    email           TEXT UNIQUE,                -- optional, for notifications
    display_name    TEXT,                       -- 1-50 chars
    avatar_cid      TEXT,                       -- IPFS CID of avatar image
    wallet_address_v2 TEXT,                     -- Solana address, nullable, reserved
    role            TEXT DEFAULT 'reader',      -- ENUM: reader, creator, admin
    created_at      INTEGER NOT NULL,           -- Unix timestamp (seconds)
    updated_at      INTEGER NOT NULL            -- Unix timestamp (seconds)
);
```

**约束**：
- username: `^[a-z0-9_]{3,20}$`
- email: RFC 5322 compliant
- role: CHECK IN ('reader', 'creator', 'admin')

### 1.2 创作者表 (creators)

```sql
CREATE TABLE creators (
    id              TEXT PRIMARY KEY,           -- UUID v7
    user_id         TEXT NOT NULL UNIQUE,       -- FK → users.id
    display_name    TEXT NOT NULL,              -- 1-50 chars
    bio             TEXT,                       -- max 500 chars
    verified        INTEGER DEFAULT 0,          -- 0=false, 1=true
    total_books     INTEGER DEFAULT 0,          -- derived, updated by trigger
    total_reads     INTEGER DEFAULT 0,          -- derived
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 1.3 书籍表 (books)

```sql
CREATE TABLE books (
    id              TEXT PRIMARY KEY,           -- UUID v7
    creator_id      TEXT NOT NULL,              -- FK → creators.id
    title           TEXT NOT NULL,              -- 1-200 chars
    author          TEXT NOT NULL,              -- display name at publish time
    description     TEXT,                       -- max 2000 chars
    cover_cid       TEXT,                       -- IPFS CID of cover image
    content_cid     TEXT,                       -- IPFS CID of raw content JSON (hot cache)
    structured_cid  TEXT,                       -- IPFS CID of parsed chapter structure (hot cache)
    arweave_tx      TEXT,                       -- Arweave transaction id (permanent storage)
    format          TEXT DEFAULT 'markdown',    -- ENUM: markdown, text
    status          TEXT DEFAULT 'draft',       -- ENUM: draft, publishing, published, archived
    ai_ratio        INTEGER DEFAULT 100,        -- AI生成比例 0-100
    ai_mode         TEXT DEFAULT 'ai_only',     -- ENUM: ai_only, light_hybrid, heavy_hybrid
    tags            TEXT,                       -- JSON array of strings, max 10 tags
    word_count      INTEGER DEFAULT 0,          -- total word count
    chapter_count   INTEGER DEFAULT 0,          -- number of chapters
    rating_avg      REAL DEFAULT 0,             -- 0-5, derived
    rating_count    INTEGER DEFAULT 0,          -- derived
    read_count      INTEGER DEFAULT 0,          -- derived
    created_at      INTEGER NOT NULL,
    published_at    INTEGER,                    -- nullable until published
    FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);
```

**约束**：
- status: CHECK IN ('draft', 'publishing', 'published', 'archived')
- ai_ratio: CHECK >= 0 AND <= 100
- ai_mode: CHECK IN ('ai_only', 'light_hybrid', 'heavy_hybrid')
- rating_avg: CHECK >= 0 AND <= 5
- word_count: CHECK >= 0
- chapter_count: CHECK >= 0

### 1.4 章节表 (chapters)

```sql
CREATE TABLE chapters (
    id              TEXT PRIMARY KEY,           -- UUID v7
    book_id         TEXT NOT NULL,              -- FK → books.id
    idx             INTEGER NOT NULL,           -- chapter index, 0-based
    title           TEXT NOT NULL,              -- 1-200 chars
    content_cid     TEXT NOT NULL,              -- IPFS CID of chapter content (hot cache)
    arweave_tx      TEXT,                       -- Arweave transaction id (permanent backup)
    word_count      INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(book_id, idx)
);
```

### 1.5 阅读进度表 (reading_progress)

```sql
CREATE TABLE reading_progress (
    id              TEXT PRIMARY KEY,           -- UUID v7
    user_id         TEXT NOT NULL,              -- FK → users.id
    book_id         TEXT NOT NULL,              -- FK → books.id
    chapter_id      TEXT,                       -- FK → chapters.id, nullable
    position        INTEGER DEFAULT 0,          -- character offset in chapter
    percent         REAL DEFAULT 0,             -- 0.0 - 100.0
    is_finished     INTEGER DEFAULT 0,          -- 0=false, 1=true
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
    UNIQUE(user_id, book_id)
);
```

### 1.6 批注表 (annotations)

```sql
CREATE TABLE annotations (
    id              TEXT PRIMARY KEY,           -- UUID v7
    user_id         TEXT NOT NULL,              -- FK → users.id
    book_id         TEXT NOT NULL,              -- FK → books.id
    chapter_id      TEXT NOT NULL,              -- FK → chapters.id
    range_start     INTEGER NOT NULL,           -- start character offset
    range_end       INTEGER NOT NULL,           -- end character offset
    selected_text   TEXT NOT NULL,              -- highlighted text snippet
    note            TEXT,                       -- user note, max 1000 chars
    color           TEXT DEFAULT '#FFD700',     -- highlight color hex
    is_public       INTEGER DEFAULT 1,          -- 0=private, 1=public
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);
```

**约束**：
- range_start: CHECK >= 0
- range_end: CHECK > range_start
- color: CHECK LIKE '#______' OR LIKE '#________'

### 1.7 评论表 (comments)

```sql
CREATE TABLE comments (
    id              TEXT PRIMARY KEY,           -- UUID v7
    user_id         TEXT NOT NULL,              -- FK → users.id
    book_id         TEXT NOT NULL,              -- FK → books.id
    chapter_id      TEXT,                       -- FK → chapters.id, nullable (book-level comment)
    parent_id       TEXT,                       -- FK → comments.id, nullable (reply)
    content         TEXT NOT NULL,              -- max 2000 chars
    likes           INTEGER DEFAULT 0,          -- derived
    is_deleted      INTEGER DEFAULT 0,          -- soft delete
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
```

### 1.8 书单表 (booklists)

```sql
CREATE TABLE booklists (
    id              TEXT PRIMARY KEY,           -- UUID v7
    user_id         TEXT NOT NULL,              -- FK → users.id
    title           TEXT NOT NULL,              -- 1-100 chars
    description     TEXT,                       -- max 500 chars
    tags            TEXT,                       -- JSON array
    is_public       INTEGER DEFAULT 1,
    item_count      INTEGER DEFAULT 0,          -- derived
    likes           INTEGER DEFAULT 0,          -- derived
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 1.9 动态表 (activities)

```sql
CREATE TABLE activities (
    id              TEXT PRIMARY KEY,           -- UUID v7
    user_id         TEXT NOT NULL,              -- FK → users.id
    type            TEXT NOT NULL,              -- ENUM: publish, read, annotate, comment, follow, like_book, like_list
    book_id         TEXT,                       -- nullable
    annotation_id   TEXT,                       -- nullable
    comment_id      TEXT,                       -- nullable
    booklist_id     TEXT,                       -- nullable
    content         TEXT,                       -- activity description
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

**约束**：
- type: CHECK IN ('publish', 'read', 'annotate', 'comment', 'follow', 'like_book', 'like_list')

### 1.10 榜单表 (rankings)

```sql
CREATE TABLE rankings (
    id              TEXT PRIMARY KEY,           -- UUID v7
    type            TEXT NOT NULL,              -- ENUM: hot, new, rated, trending
    book_id         TEXT NOT NULL,              -- FK → books.id
    score           REAL NOT NULL,              -- ranking score
    period          TEXT NOT NULL,              -- ENUM: daily, weekly, monthly, all_time
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(type, book_id, period)
);

-- 公版书表
CREATE TABLE public_domain_books (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    author          TEXT NOT NULL,
    description     TEXT,
    cover_cid       TEXT,
    content_cid     TEXT,
    source          TEXT,                       -- 来源: gutenberg, archive.org, etc.
    source_url      TEXT,
    language        TEXT DEFAULT 'zh',
    publish_year    INTEGER,
    category        TEXT,
    tags            TEXT,
    word_count      INTEGER DEFAULT 0,
    chapter_count   INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'active',      -- ENUM: active, archived
    imported_at     INTEGER NOT NULL
);

-- 用户博客文章表
CREATE TABLE user_blog_posts (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    type                TEXT NOT NULL,          -- ENUM: comment, annotation, ai_summary, custom
    title               TEXT NOT NULL,
    content             TEXT NOT NULL,
    source_book_id      TEXT,
    source_chapter_id   TEXT,
    source_comment_id   TEXT,
    source_annotation_id TEXT,
    is_public           INTEGER DEFAULT 1,
    likes               INTEGER DEFAULT 0,
    tags                TEXT,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户博客配置表
CREATE TABLE user_blog_configs (
    id                      TEXT PRIMARY KEY,
    user_id                 TEXT NOT NULL UNIQUE,
    subdomain               TEXT NOT NULL UNIQUE,   -- username.mythinkread.blog
    custom_domain           TEXT,
    theme                   TEXT DEFAULT 'kami',    -- ENUM: kami, minimal, dark
    title                   TEXT,
    description             TEXT,
    avatar_cid              TEXT,
    social_links            TEXT,                   -- JSON
    is_public               INTEGER DEFAULT 1,
    auto_publish_comment    INTEGER DEFAULT 0,
    auto_publish_annotation INTEGER DEFAULT 0,
    auto_publish_ai_summary INTEGER DEFAULT 0,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 协作文档表
CREATE TABLE collaborative_docs (
    id          TEXT PRIMARY KEY,
    book_id     TEXT NOT NULL,
    chapter_id  TEXT,
    title       TEXT NOT NULL,
    content     TEXT,
    version     INTEGER DEFAULT 1,
    created_by  TEXT NOT NULL,
    status      TEXT DEFAULT 'active',      -- ENUM: active, archived
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 文档操作历史表 (OT)
CREATE TABLE doc_operations (
    id          TEXT PRIMARY KEY,
    doc_id      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    operation   TEXT NOT NULL,              -- JSON: { type: 'insert'|'delete', position: N, content: '...' }
    position    INTEGER NOT NULL,
    content     TEXT,
    version     INTEGER NOT NULL,
    timestamp   INTEGER NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES collaborative_docs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 文档协作者表
CREATE TABLE doc_collaborators (
    id          TEXT PRIMARY KEY,
    doc_id      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    role        TEXT DEFAULT 'editor',      -- ENUM: owner, editor, viewer
    joined_at   INTEGER NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES collaborative_docs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(doc_id, user_id)
);

-- TTS 音频缓存表
CREATE TABLE tts_audio_cache (
    id          TEXT PRIMARY KEY,
    book_id     TEXT,
    chapter_id  TEXT,
    voice_id    TEXT NOT NULL,
    text_hash   TEXT NOT NULL,
    audio_cid   TEXT,
    audio_url   TEXT,
    duration    INTEGER,                    -- seconds
    status      TEXT DEFAULT 'pending',     -- ENUM: pending, generating, completed, failed
    created_at  INTEGER NOT NULL,
    completed_at INTEGER,
    UNIQUE(chapter_id, voice_id, text_hash)
);
```

## 2. 接口定义

### 2.1 认证接口

#### POST /api/auth/register

**请求**：
```json
{
    "username": "string",      // required, 3-20 chars, [a-z0-9_]
    "email": "string",         // optional
    "password": "string"       // required, 8-100 chars
}
```

**响应 201**：
```json
{
    "id": "uuid",
    "username": "string",
    "display_name": "string",
    "role": "reader",
    "created_at": 1234567890
}
```

**错误码**：
- 400: INVALID_USERNAME | INVALID_PASSWORD | INVALID_EMAIL
- 409: USERNAME_EXISTS | EMAIL_EXISTS

#### POST /api/auth/login

**请求**：
```json
{
    "username": "string",
    "password": "string"
}
```

**响应 200**：
```json
{
    "token": "jwt_string",
    "user": {
        "id": "uuid",
        "username": "string",
        "display_name": "string",
        "role": "string"
    }
}
```

**错误码**：
- 401: INVALID_CREDENTIALS

### 2.2 AI 创作接口

#### POST /api/ai/generate

**前置条件**：用户已登录，且 role = 'creator'

**请求**：
```json
{
    "prompt": "string",        // required, max 2000 chars
    "type": "chapter",         // ENUM: chapter, outline, description
    "context": "string",       // optional, previous content for continuity
    "max_tokens": 2000,        // optional, default 2000, max 4000
    "temperature": 0.7         // optional, default 0.7, range 0.0-1.0
}
```

**响应 200**：
```json
{
    "content": "string",       // generated text
    "tokens_used": 1234,
    "finish_reason": "stop"
}
```

**错误码**：
- 400: INVALID_PROMPT | INVALID_PARAMS
- 429: RATE_LIMIT_EXCEEDED
- 503: AI_SERVICE_UNAVAILABLE

#### POST /api/ai/continue

**请求**：
```json
{
    "previous_text": "string", // required, max 8000 chars
    "direction": "string",     // optional, guidance for continuation
    "max_tokens": 2000
}
```

**响应**：同 /api/ai/generate

#### POST /api/ai/cover

**请求**：
```json
{
    "description": "string",   // required, book description or prompt
    "style": "anime",          // ENUM: anime, realistic, minimalist, abstract
    "size": "portrait"         // ENUM: portrait (2:3), landscape (3:2), square (1:1)
}
```

**响应 200**：
```json
{
    "image_url": "string",     // temporary URL, valid for 1 hour
    "prompt_used": "string"    // actual prompt sent to AI
}
```

### 2.3 书籍接口

#### POST /api/books

**前置条件**：用户已登录，role = 'creator'

**请求**：
```json
{
    "title": "string",         // required, 1-200 chars
    "description": "string",   // optional, max 2000 chars
    "tags": ["string"],        // optional, max 10 tags
    "ai_ratio": 100,           // 0-100, AI生成比例
    "ai_mode": "ai_only"       // ENUM: ai_only, light_hybrid, heavy_hybrid
}
```

**响应 201**：
```json
{
    "id": "uuid",
    "title": "string",
    "status": "draft",
    "created_at": 1234567890
}
```

#### POST /api/books/:id/chapters

**请求**：
```json
{
    "title": "string",         // required
    "content": "string",       // required, chapter content in markdown
    "idx": 0                   // optional, auto-increment if omitted
}
```

**响应 201**：
```json
{
    "id": "uuid",
    "book_id": "uuid",
    "idx": 0,
    "title": "string",
    "content_cid": "Qm...",
    "word_count": 3500
}
```

**处理流程**：
1. 校验 content 长度 (max 50,000 chars)
2. 生成章节内容 JSON: `{"title": "...", "content": "...", "word_count": N}`
3. 上传 JSON 到 IPFS via Pinata
4. 获取 CID，写入 chapters 表
5. 更新 books.word_count 和 books.chapter_count

#### POST /api/books/:id/publish

**前置条件**：book.status = 'draft', at least 1 chapter, 且满足人机协作要求：
- 若 ai_mode != 'ai_only'：创作者编辑比例必须 ≥ 20%（通过 diff 检测）
- 若 ai_mode = 'ai_only'：允许直接发布

**响应 200**：
```json
{
    "id": "uuid",
    "status": "publishing",
    "message": "Book is being processed and will be available shortly"
}
```

**异步处理**：
1. 收集所有章节 content
2. 生成完整书籍结构化 JSON
3. 上传结构化 JSON 到 IPFS
4. 生成/上传封面（如未提供）
5. 更新 books.status = 'published', books.published_at
6. 创建 activity record

#### GET /api/books

**查询参数**：
```
?page=1&limit=20&sort=hot&tag=scifi&search=keyword&status=published
```

**响应 200**：
```json
{
    "items": [
        {
            "id": "uuid",
            "title": "string",
            "author": "string",
            "description": "string",
            "cover_cid": "Qm...",
            "tags": ["scifi", "ai"],
            "word_count": 50000,
            "chapter_count": 20,
            "rating_avg": 4.5,
            "read_count": 1234,
            "created_at": 1234567890
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "total_pages": 5
    }
}
```

#### GET /api/books/:id

**响应 200**：
```json
{
    "id": "uuid",
    "title": "string",
    "author": "string",
    "description": "string",
    "cover_cid": "Qm...",
    "content_cid": "Qm...",
    "structured_cid": "Qm...",
    "ai_ratio": 85,
    "ai_mode": "light_hybrid",
    "tags": ["scifi"],
    "word_count": 50000,
    "chapter_count": 20,
    "rating_avg": 4.5,
    "rating_count": 100,
    "read_count": 1234,
    "status": "published",
    "chapters": [
        {"id": "uuid", "idx": 0, "title": "Chapter 1", "word_count": 2500}
    ],
    "creator": {
        "id": "uuid",
        "display_name": "string",
        "verified": true
    },
    "created_at": 1234567890,
    "published_at": 1234567890
}
```

#### GET /api/books/:id/read/:chapter_id

**响应 200**：
```json
{
    "chapter": {
        "id": "uuid",
        "idx": 0,
        "title": "string",
        "content": "string",     // full markdown content
        "word_count": 2500
    },
    "progress": {
        "position": 0,
        "percent": 0,
        "is_finished": false
    },
    "annotations": [
        {
            "id": "uuid",
            "range_start": 100,
            "range_end": 150,
            "selected_text": "highlighted text",
            "note": "my note",
            "color": "#FFD700",
            "user": {"id": "uuid", "username": "string"}
        }
    ]
}
```

**内容获取策略**：
1. 从 chapters.content_cid 获取 IPFS 内容
2. 优先 KV 缓存: `book:chapter:{chapter_id}`
3. 未命中则通过 Cloudflare IPFS Gateway 获取
4. 写入 KV，TTL 7 天

### 2.4 批注接口

#### POST /api/annotations

**请求**：
```json
{
    "book_id": "uuid",
    "chapter_id": "uuid",
    "range_start": 100,
    "range_end": 150,
    "selected_text": "string",
    "note": "string",
    "color": "#FFD700",
    "is_public": 1
}
```

**响应 201**：
```json
{
    "id": "uuid",
    "book_id": "uuid",
    "chapter_id": "uuid",
    "range_start": 100,
    "range_end": 150,
    "selected_text": "string",
    "note": "string",
    "color": "#FFD700",
    "is_public": 1,
    "created_at": 1234567890
}
```

### 2.5 评论接口

#### POST /api/comments

**请求**：
```json
{
    "book_id": "uuid",
    "chapter_id": "uuid",      // optional
    "parent_id": "uuid",       // optional, for reply
    "content": "string"        // required, max 2000 chars
}
```

**响应 201**：
```json
{
    "id": "uuid",
    "user_id": "uuid",
    "username": "string",
    "content": "string",
    "likes": 0,
    "created_at": 1234567890
}
```

**内容审核流程**：
1. AI 审核: Cloudflare AI 检测 toxic/harmful content
2. 通过阈值: toxicity < 0.5, 无 hate speech
3. 未通过: 返回 400 CONTENT_VIOLATION
4. 通过后写入 D1

### 2.6 数据导出接口

#### GET /api/export/all

**响应 200**：
```json
{
    "user": {
        "id": "uuid",
        "username": "string",
        "export_at": 1234567890
    },
    "reading_progress": [...],
    "annotations": [...],
    "comments": [...],
    "activities": [...]
}
```

**导出格式选项**：
- `?format=json` (default)
- `?format=csv` — 返回 zip 文件

## 3. 状态机

### 3.1 书籍状态机

```
[draft] --(publish)--> [publishing] --(async_complete)--> [published]
   │                                                    │
   │--(archive)-------------------> [archived] <--------│
   │                       │                            │
   │                       └──(unarchive)---------------│
   │
   └──(delete)--> [deleted] (soft delete, 30d retention)
```

**触发条件**：
- `draft → publishing`: 创作者调用 POST /api/books/:id/publish，且 chapter_count >= 1
- `publishing → published`: 异步 Worker 完成 IPFS 上传和结构化处理
- `published → archived`: 创作者调用 PUT /api/books/:id/archive
- `archived → published`: 创作者调用 PUT /api/books/:id/unarchive

### 3.2 评论状态机

```
[active] --(delete_by_author)--> [deleted]
   │
   └──(report)--> [under_review] --(moderator_approve)--> [active]
                            │
                            └──(moderator_reject)--> [removed]
```

## 4. 常量定义

```typescript
// 文件/内容限制
const MAX_FILE_SIZE = 50 * 1024 * 1024;        // 50MB
const MAX_CHAPTER_CONTENT = 50000;              // chars
const MAX_BOOK_DESCRIPTION = 2000;              // chars
const MAX_COMMENT_LENGTH = 2000;                // chars
const MAX_ANNOTATION_NOTE = 1000;               // chars
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

// 分页
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// 缓存 TTL
const KV_CACHE_BOOK_CONTENT = 7 * 24 * 60 * 60;     // 7 days
const KV_CACHE_RANKING = 60 * 60;                    // 1 hour
const KV_CACHE_FEED = 60 * 60;                       // 1 hour
const KV_CACHE_USER_PROGRESS = 30 * 24 * 60 * 60;    // 30 days
const KV_CACHE_SESSION = 7 * 24 * 60 * 60;           // 7 days

// AI 生成限制
const AI_MAX_PROMPT_LENGTH = 2000;
const AI_MAX_CONTEXT_LENGTH = 8000;
const AI_DEFAULT_MAX_TOKENS = 2000;
const AI_MAX_MAX_TOKENS = 4000;
const AI_DEFAULT_TEMPERATURE = 0.7;
const AI_RATE_LIMIT_PER_MINUTE = 10;

// 人机协作要求
const MIN_HUMAN_EDIT_RATIO = 20;              // 非纯 AI 书籍最低人工编辑比例 %
const AI_ONLY_THRESHOLD = 90;                 // ≥90% AI = ai_only
const LIGHT_HYBRID_THRESHOLD = 50;            // 50-89% = light_hybrid
                                              // <50% = heavy_hybrid

// 一致性记忆
const MAX_MEMORY_CONTEXT_CHAPTERS = 5;        // AI 记忆最近 N 章
const MAX_MEMORY_TOKENS = 4000;               // 记忆上下文最大 tokens

// 榜单
const RANKING_PERIOD_DAILY = 'daily';
const RANKING_PERIOD_WEEKLY = 'weekly';
const RANKING_PERIOD_MONTHLY = 'monthly';
const RANKING_PERIOD_ALL_TIME = 'all_time';

// 评分
const RATING_MIN = 0;
const RATING_MAX = 5;

// Kami 设计系统
const KAMI_BG_COLOR = '#FAF7F0';              // 暖米纸底
const KAMI_INK_COLOR = '#1E3A5F';             // 油墨蓝
const KAMI_ACCENT_COLOR = '#C75B39';          // 朱砂红点缀
const KAMI_FONT_SERIF = "'Noto Serif SC', 'Source Han Serif SC', serif";  // 中文 serif
const KAMI_FONT_SANS = "'Inter', 'Noto Sans SC', sans-serif";             // 英文 sans
const KAMI_MAX_CARD_WIDTH = 1200;             // 书摘卡片最大宽度
const KAMI_PDF_PAGE_SIZE = 'A4';

// 协作编辑
const OT_SYNC_INTERVAL = 3000;                // 操作同步间隔 ms
const OT_MAX_HISTORY = 1000;                  // 最大操作历史数
const OT_COLLABORATOR_LIMIT = 10;             // 单文档最大协作者数

// 博客
const BLOG_SUBDOMAIN_MAX_LENGTH = 30;
const BLOG_POSTS_PER_PAGE = 10;
```

## 5. 算法

### 5.1 榜单评分算法

```
score = (read_count * 1) + (annotation_count * 3) + (comment_count * 2) + (rating_avg * rating_count * 10)

// 时间衰减 (trending)
time_decay = exp(-hours_since_publish / 168)  // 7-day half-life

trending_score = score * time_decay
```

### 5.2 阅读进度计算

```
// 单章进度
chapter_percent = (position / chapter_word_count) * 100

// 全书进度
total_read = sum(previous_chapters_word_count) + position
total_percent = (total_read / book_word_count) * 100

// 标记完成
is_finished = total_percent >= 95%
```

### 5.3 内容获取（IPFS 热缓存 + Arweave 永久备份）

```
function getContent(cid, arweaveTx):
    // 1. 查 KV 缓存
    cached = KV.get("content:" + cid)
    if cached:
        return cached
    
    // 2. 通过 Cloudflare IPFS Gateway 获取（热存储）
    url = "https://cloudflare-ipfs.com/ipfs/" + cid
    response = fetch(url, { timeout: 5000 })
    
    if response.ok:
        content = response.text()
        // 3. 写入缓存
        KV.put("content:" + cid, content, { expirationTtl: 7 * 86400 })
        return content
    
    // 4. fallback 到 Pinata Gateway
    url = "https://gateway.pinata.cloud/ipfs/" + cid
    response = fetch(url, { timeout: 10000 })
    
    if response.ok:
        content = response.text()
        KV.put("content:" + cid, content, { expirationTtl: 7 * 86400 })
        return content
    
    // 5. 终极 fallback: Arweave 永久存储
    if arweaveTx:
        url = "https://arweave.net/" + arweaveTx
        response = fetch(url, { timeout: 15000 })
        
        if response.ok:
            content = response.text()
            // 回写 IPFS 缓存（异步）
            Queue.send({ action: "re-pin-to-ipfs", cid, content })
            KV.put("content:" + cid, content, { expirationTtl: 7 * 86400 })
            return content
    
    throw ERROR_CONTENT_UNAVAILABLE
```

## 6. 边界条件

1. **空书籍发布**: chapter_count = 0 时拒绝发布
2. **超大章节**: content > 50,000 chars 时拒绝，提示分章
3. **并发发布**: 同一书籍多次调用 publish，幂等处理（status != 'draft' 时忽略）
4. **IPFS 不可用**: 异步任务失败，重试 3 次后标记 status = 'publish_failed'，通知创作者
5. **AI 生成失败**: 返回 503，前端提示重试
6. **评论嵌套过深**: parent_id 链深度 > 5 时拒绝，强制扁平化
7. **批量导出超时**: 数据量 > 10MB 时转为异步任务，通过 Queue 处理，邮件通知
8. **KV 缓存击穿**: 热点内容使用 stale-while-revalidate 策略
9. **D1 连接池耗尽**: Workers 自动重试，指数退避
10. **同名书籍**: 允许同名，通过 id 区分，搜索时按热度排序
11. **人机协作不足**: ai_mode != 'ai_only' 但编辑比例 < 20% 时拒绝发布，提示继续编辑
12. **AI 比例虚报**: 系统通过 diff 算法自动计算 AI 生成比例，不允许创作者手动修改
13. **AI 记忆溢出**: 上下文超过 MAX_MEMORY_TOKENS 时，自动截断最早章节，保留关键设定
14. **风格漂移**: AI 续写时风格不一致，通过 system prompt 注入风格描述词约束
15. **Arweave 上传失败**: 重试 3 次后标记 arweave_status = 'pending'，后台定时重试
16. **存储成本超预算**: 单本书 > 100MB 时提示创作者优化（压缩图片/分卷）
17. **IPFS 与 Arweave 数据不一致**: 以 Arweave tx 为准，定期校验并修复
18. **Kami 渲染失败**: 降级为纯文本渲染，记录错误日志
19. **协作编辑冲突**: OT 自动合并，无法合并时提示用户手动解决
20. **博客 subdomain 冲突**: 用户名唯一，自动分配 username.mythinkread.blog

## 7. 存储成本估算

| 场景 | 大小 | Arweave 成本 | 说明 |
|------|------|-------------|------|
| 纯文本小说 | 1-5 MB | ~0.01-0.06 USD | 大多数书籍 |
| 带封面/插图 | 5-20 MB | ~0.05-0.22 USD | 普通书籍 |
| 高清图片合集 | 50-100 MB | ~0.4-1.1 USD | 极少数 |
| 单章节文件 | <100 KB | ~0.001 USD | 接近免费 |
| Wiki 存储 | 2-5 MB | ~0.02-0.05 USD | 一次性永久 |
| 音频存储 | 5-20 MB/章节 | ~0.01-0.5 USD | 一次性永久 |

**平台年度预算（示例）**：
- 5000 本书 × 平均 10MB × ~0.08 USD/GB = **~400 USD/年**
- 10 万本书 = **~8000 USD/年**
- Wiki 存储: 5000 本 × 3MB × ~0.03 USD = **~150 USD/年**
- 音频存储: 1000 本 × 20 章 × 10MB × ~0.08 USD = **~1600 USD/年**

**成本优化策略**：
- 创作者前 3 本书免费生成 Wiki + 免费音频（平台补贴）
- 超过 100MB 的书籍提示优化
- 使用 Bundlr/Irys 批量上传降低 20-50% 费用
- Kami 渲染纯前端计算，零服务器成本

## 8. 验收标准

- [ ] 所有表结构精确定义，包含字段类型、约束、外键（含 V2 扩展表）
- [ ] 每个接口定义包含请求/响应格式、错误码、前置条件
- [ ] 状态机覆盖书籍和评论核心实体
- [ ] 所有硬编码值集中定义为常量（含 Kami 设计系统常量）
- [ ] 非 trivial 算法提供伪代码
- [ ] 存储策略明确区分 IPFS（热）和 Arweave（冷/永久）
- [ ] 内容获取支持 IPFS → Arweave 多级 fallback
- [ ] 存储成本估算清晰，预算可控（含 Wiki + 音频成本）
- [ ] 至少 10 个边界条件已列出并给出处理策略
- [ ] Kami 设计系统常量已定义（颜色、字体、尺寸）
- [ ] 协作编辑 OT 协议参数已定义（同步间隔、历史限制）
- [ ] 博客系统参数已定义（subdomain 规则、分页）
