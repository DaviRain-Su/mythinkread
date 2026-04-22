-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    display_name TEXT,
    avatar_cid TEXT,
    wallet_address_v2 TEXT,
    role TEXT DEFAULT 'reader' CHECK (role IN ('reader', 'creator', 'admin')),
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Creators table
CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    bio TEXT,
    verified INTEGER DEFAULT 0,
    total_books INTEGER DEFAULT 0,
    total_reads INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    cover_cid TEXT,
    content_cid TEXT,
    structured_cid TEXT,
    arweave_tx TEXT,
    format TEXT DEFAULT 'markdown' CHECK (format IN ('markdown', 'text')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'published', 'archived')),
    ai_ratio INTEGER DEFAULT 100 CHECK (ai_ratio >= 0 AND ai_ratio <= 100),
    ai_mode TEXT DEFAULT 'ai_only' CHECK (ai_mode IN ('ai_only', 'light_hybrid', 'heavy_hybrid')),
    tags TEXT,
    word_count INTEGER DEFAULT 0 CHECK (word_count >= 0),
    chapter_count INTEGER DEFAULT 0 CHECK (chapter_count >= 0),
    rating_avg REAL DEFAULT 0 CHECK (rating_avg >= 0 AND rating_avg <= 5),
    rating_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    published_at INTEGER,
    FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

-- Chapters table
-- content_cid is nullable: drafts live only in KV (chapter:draft:<id>) until
-- the book is published, at which point the queue consumer fills in the real
-- IPFS CID and Arweave transaction ID.
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_cid TEXT,
    arweave_tx TEXT,
    word_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(book_id, idx)
);

-- Reading progress table
CREATE TABLE IF NOT EXISTS reading_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    chapter_id TEXT,
    position INTEGER DEFAULT 0,
    percent REAL DEFAULT 0,
    is_finished INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
    UNIQUE(user_id, book_id)
);

-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    range_start INTEGER NOT NULL CHECK (range_start >= 0),
    range_end INTEGER NOT NULL CHECK (range_end > range_start),
    selected_text TEXT NOT NULL,
    note TEXT,
    color TEXT DEFAULT '#FFD700',
    is_public INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    chapter_id TEXT,
    parent_id TEXT,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Booklists table
CREATE TABLE IF NOT EXISTS booklists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    is_public INTEGER DEFAULT 1,
    item_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Booklist items table
CREATE TABLE IF NOT EXISTS booklist_items (
    id TEXT PRIMARY KEY,
    booklist_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    FOREIGN KEY (booklist_id) REFERENCES booklists(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(follower_id, following_id)
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('publish', 'read', 'annotate', 'comment', 'follow', 'like_book', 'like_list')),
    book_id TEXT,
    annotation_id TEXT,
    comment_id TEXT,
    booklist_id TEXT,
    content TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Rankings table
CREATE TABLE IF NOT EXISTS rankings (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('hot', 'new', 'rated', 'trending')),
    book_id TEXT NOT NULL,
    score REAL NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(type, book_id, period)
);

-- TTS audio cache table (for AI voice reading)
-- No FK on book_id/chapter_id so that TTS can be generated for arbitrary
-- text snippets even before the parent rows exist.
CREATE TABLE IF NOT EXISTS tts_audio_cache (
    id TEXT PRIMARY KEY,
    book_id TEXT,
    chapter_id TEXT,
    voice_id TEXT NOT NULL,
    text_hash TEXT NOT NULL,
    audio_cid TEXT,
    audio_url TEXT,
    duration INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    UNIQUE(book_id, chapter_id, voice_id, text_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_creator ON books(creator_id);
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_book ON comments(book_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_rankings_type ON rankings(type, period, score DESC);
