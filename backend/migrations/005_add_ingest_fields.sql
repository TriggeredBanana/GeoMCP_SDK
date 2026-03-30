-- Migration: Add ingest pipeline fields to documents table.

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS last_modified   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS file_hash       TEXT,
    ADD COLUMN IF NOT EXISTS indexing_status TEXT NOT NULL DEFAULT 'new',
    ADD COLUMN IF NOT EXISTS indexed_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error_message   TEXT;

-- Index for querying documents by status (e.g. find all that need processing)
CREATE INDEX IF NOT EXISTS idx_documents_indexing_status
    ON documents (indexing_status);

-- Backfill status for existing rows that were already successfully indexed
UPDATE documents
    SET indexing_status = 'ready', indexed_at = updated_at
WHERE indexing_status = 'new' AND content != '';
