-- Migration: Add source_blob column to documents for blob storage tracking.
-- NOTE: This migration is superseded by 001 which now includes all columns.
-- Only needed if upgrading an existing database that ran the original 001.

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS source_blob TEXT;

-- Add unique constraint only if it doesn't already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_documents_source_blob'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT uq_documents_source_blob UNIQUE (source_blob);
    END IF;
END $$;
