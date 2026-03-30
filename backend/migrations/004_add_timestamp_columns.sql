-- Migration: Add missing timestamp columns and fix trigger function.
-- The documents table was created without created_at/updated_at columns,
-- causing the trigger function from migration 001 to fail.

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT now();

-- Re-create trigger function now that updated_at exists
CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('norwegian', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('norwegian', COALESCE(NEW.content, '')), 'B');
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
