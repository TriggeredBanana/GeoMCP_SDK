-- Migration: Ensure source_blob has a proper unique constraint (not a partial index).
-- The full unique constraint is required for ON CONFLICT (source_blob) in PostgreSQL.
-- Safe to run multiple times — checks before creating.

DROP INDEX IF EXISTS idx_documents_source_blob;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_documents_source_blob'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT uq_documents_source_blob UNIQUE (source_blob);
    END IF;
END $$;
