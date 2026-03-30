-- Migration: Replace partial unique index on source_blob with a full unique constraint.
-- The partial index (WHERE source_blob IS NOT NULL) from migration 002 is not compatible
-- with ON CONFLICT (source_blob) in PostgreSQL. A full unique constraint is required.
-- Multiple NULLs are allowed by PostgreSQL even with a unique constraint.

DROP INDEX IF EXISTS idx_documents_source_blob;

ALTER TABLE documents
    ADD CONSTRAINT uq_documents_source_blob UNIQUE (source_blob);
