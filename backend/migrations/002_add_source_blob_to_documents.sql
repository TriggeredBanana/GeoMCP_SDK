-- Migration: Add source_blob column to documents for blob storage tracking.
-- NOTE: This migration is superseded by 001 which now includes all columns.
-- Only needed if upgrading an existing database that ran the original 001.

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS source_blob TEXT;

-- Full unique constraint (not partial) — required for ON CONFLICT (source_blob)
ALTER TABLE documents
    ADD CONSTRAINT IF NOT EXISTS uq_documents_source_blob UNIQUE (source_blob);
