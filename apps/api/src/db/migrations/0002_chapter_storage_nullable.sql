-- 0002_chapter_storage_nullable.sql
-- Drafts keep their body in KV under `chapter:draft:<id>` until the book is
-- published. The previous schema forced `chapters.content_cid` to be NOT NULL
-- with an empty-string placeholder, which conflicts with the F1 publish
-- pipeline that writes real CIDs back only after IPFS/Arweave upload.
--
-- SQLite cannot ALTER a column's NULL constraint in place — we recreate the
-- table, copy existing rows, drop the old one, and rename. Indexes are
-- recreated at the end.

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS chapters_new (
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

INSERT INTO chapters_new (id, book_id, idx, title, content_cid, arweave_tx, word_count, created_at)
SELECT id, book_id, idx, title,
       -- migrate empty-string placeholders to NULL
       CASE WHEN content_cid = '' THEN NULL ELSE content_cid END,
       arweave_tx, word_count, created_at
FROM chapters;

DROP TABLE chapters;
ALTER TABLE chapters_new RENAME TO chapters;

CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);

COMMIT;

PRAGMA foreign_keys=ON;
