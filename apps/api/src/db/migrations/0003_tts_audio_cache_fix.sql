-- 0003_tts_audio_cache_fix.sql
-- The tts_audio_cache table originally had no explicit FK constraints on
-- book_id / chapter_id, but the application code skipped DB inserts with a
-- TODO about "avoiding FK issues".  This migration makes the intent explicit
-- by ensuring the table exists with relaxed references (no FK) so that TTS
-- rows can be inserted regardless of whether the parent book/chapter exists.
--
-- SQLite doesn't let us ALTER TABLE to add/drop FKs, so if the table already
-- exists we simply verify the schema is compatible.  Fresh installs will pick
-- up the updated schema.sql.

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- If the old table exists without the completed_at column, migrate it.
-- Otherwise this is a no-op on fresh databases.
CREATE TABLE IF NOT EXISTS tts_audio_cache_new (
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

INSERT OR IGNORE INTO tts_audio_cache_new
SELECT
    id,
    book_id,
    chapter_id,
    voice_id,
    text_hash,
    audio_cid,
    audio_url,
    duration,
    status,
    created_at,
    completed_at
FROM tts_audio_cache;

DROP TABLE IF EXISTS tts_audio_cache;
ALTER TABLE tts_audio_cache_new RENAME TO tts_audio_cache;

CREATE INDEX IF NOT EXISTS idx_tts_audio_cache ON tts_audio_cache(book_id, chapter_id, voice_id);

COMMIT;

PRAGMA foreign_keys=ON;
