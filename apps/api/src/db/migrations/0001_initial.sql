-- Migration 0001: Initial Schema
-- Created: 2026-04-21

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
    updated_at INTEGER NOT NULL,
    published_at INTEGER,
    FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_cid TEXT NOT NULL,
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

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    review TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('follow', 'comment', 'like', 'mention', 'system')),
    title TEXT NOT NULL,
    content TEXT,
    related_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USDC',
    tx_hash TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
);

-- User preferences table (for recommendations)
CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    preferred_tags TEXT,
    preferred_authors TEXT,
    reading_level TEXT,
    language TEXT DEFAULT 'zh',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Book similarity table (for recommendations)
CREATE TABLE IF NOT EXISTS book_similarities (
    id TEXT PRIMARY KEY,
    book_id_1 TEXT NOT NULL,
    book_id_2 TEXT NOT NULL,
    similarity_score REAL NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id_1) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id_2) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(book_id_1, book_id_2)
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

-- Proposals table (for DAO governance)
CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('feature', 'policy', 'treasury', 'upgrade')),
    proposer_id TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'passed', 'rejected', 'executed')),
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    voting_end_at INTEGER NOT NULL,
    executed_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (proposer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Votes table (for DAO governance)
CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('for', 'against')),
    weight INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (voter_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(proposal_id, voter_id)
);

-- Audit logs table (for admin)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Public domain books table
CREATE TABLE IF NOT EXISTS public_domain_books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    cover_cid TEXT,
    content_cid TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    language TEXT DEFAULT 'zh',
    publish_year INTEGER,
    category TEXT,
    tags TEXT,
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'imported' CHECK (status IN ('imported', 'processed', 'published', 'archived')),
    imported_at INTEGER NOT NULL,
    processed_at INTEGER,
    published_at INTEGER
);

-- Public domain chapters table
CREATE TABLE IF NOT EXISTS public_domain_chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_cid TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES public_domain_books(id) ON DELETE CASCADE,
    UNIQUE(book_id, idx)
);

-- User blog posts table (Reading GitHub)
CREATE TABLE IF NOT EXISTS user_blog_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('comment', 'annotation', 'ai_summary', 'note', 'review')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_book_id TEXT,
    source_chapter_id TEXT,
    source_comment_id TEXT,
    source_annotation_id TEXT,
    is_public INTEGER DEFAULT 1,
    likes INTEGER DEFAULT 0,
    tags TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (source_book_id) REFERENCES books(id) ON DELETE SET NULL
);

-- User blog site config table
CREATE TABLE IF NOT EXISTS user_blog_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    subdomain TEXT UNIQUE,
    custom_domain TEXT UNIQUE,
    theme TEXT DEFAULT 'default',
    title TEXT,
    description TEXT,
    avatar_cid TEXT,
    social_links TEXT,
    is_public INTEGER DEFAULT 1,
    auto_publish_comment INTEGER DEFAULT 1,
    auto_publish_annotation INTEGER DEFAULT 1,
    auto_publish_ai_summary INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Collaborative documents table (for real-time collaboration)
CREATE TABLE IF NOT EXISTS collaborative_docs (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_by TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Document operations table (for real-time collaboration history)
CREATE TABLE IF NOT EXISTS doc_operations (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    position INTEGER,
    content TEXT,
    version INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES collaborative_docs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Document collaborators table
CREATE TABLE IF NOT EXISTS doc_collaborators (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'admin')),
    joined_at INTEGER NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES collaborative_docs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(doc_id, user_id)
);

-- TTS audio cache table (for AI voice reading)
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
CREATE INDEX IF NOT EXISTS idx_ratings_book ON ratings(book_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_book_similarities ON book_similarities(book_id_1, similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_public_domain_books_status ON public_domain_books(status);
CREATE INDEX IF NOT EXISTS idx_public_domain_books_category ON public_domain_books(category);
CREATE INDEX IF NOT EXISTS idx_user_blog_posts_user ON user_blog_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blog_posts_type ON user_blog_posts(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_blog_configs_subdomain ON user_blog_configs(subdomain);
CREATE INDEX IF NOT EXISTS idx_collaborative_docs_book ON collaborative_docs(book_id);
CREATE INDEX IF NOT EXISTS idx_doc_operations_doc ON doc_operations(doc_id, version);
CREATE INDEX IF NOT EXISTS idx_tts_audio_cache ON tts_audio_cache(book_id, chapter_id, voice_id);
