-- Migration: Create documents table with full-text search support
-- Run this against your PostgreSQL database before using the search features.

CREATE TABLE IF NOT EXISTS documents (
    id            SERIAL PRIMARY KEY,
    title         TEXT NOT NULL,
    content       TEXT NOT NULL DEFAULT '',
    source_blob   TEXT,

    -- Full-text search vector (Norwegian), updated automatically via trigger
    search_vector TSVECTOR,

    -- Placeholder for future semantic search (pgvector).
    -- Stored as JSON until the vector extension is enabled in this database.
    embedding     JSONB,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One row per blob file; NULLs are allowed for manually inserted documents
    CONSTRAINT uq_documents_source_blob UNIQUE (source_blob)
);

-- GIN index for fast full-text search lookups
CREATE INDEX IF NOT EXISTS idx_documents_search_vector
    ON documents USING GIN (search_vector);

-- Trigger function: keeps search_vector in sync on INSERT or UPDATE
CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('norwegian', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('norwegian', COALESCE(NEW.content, '')), 'B');
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;
CREATE TRIGGER trg_documents_search_vector
    BEFORE INSERT OR UPDATE OF title, content
    ON documents
    FOR EACH ROW
    EXECUTE FUNCTION documents_search_vector_update();
