-- Migration 009: rebuild chunks document index + drop orphaned chat_layers table.
--
-- Replaces what was originally numbered 008 (the index rebuild) and cleans up
-- app.chat_layers, which was created by the old migration 008 but is no longer
-- used now that layer persistence has been removed from the application.

-- Remove the orphaned table (safe to run even if it was never created).
DROP TABLE IF EXISTS app.chat_layers;

-- Rebuild the chunks-by-document index to include chunk_index so sequential
-- reads stay in document order. The old index on (document_id) alone is dropped
-- first; both operations are idempotent so this migration is safe to re-run.
DROP INDEX IF EXISTS idx_chunks_document_id;

CREATE INDEX IF NOT EXISTS idx_chunks_document_id
    ON chunks (document_id, chunk_index);
