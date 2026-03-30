"""
SearchService — unified search across documents.

Provides four search strategies:
  - search_full_text:  tsvector-based Norwegian full-text search  (active)
  - search_semantic:   pgvector cosine similarity                 (stub — pgvector not yet enabled)
  - search_fuzzy:      pg_trgm trigram matching                   (ILIKE fallback — pg_trgm not yet enabled)
  - hybrid_search:     combines all three, tolerates missing backends

For document ingestion, see ingest_pipeline.py.
"""

import logging
from db import query

logger = logging.getLogger(__name__)


async def search_full_text(search_query: str, limit: int = 10) -> list[dict]:
    """
    Norwegian full-text search using tsvector + plainto_tsquery.
    Returns documents ranked by relevance (ts_rank).
    """
    if not search_query or not search_query.strip():
        return []

    rows = await query(
        """
        SELECT
            id,
            title,
            content,
            ts_rank(search_vector, plainto_tsquery('norwegian', %(q)s)) AS score
        FROM documents
        WHERE search_vector @@ plainto_tsquery('norwegian', %(q)s)
        ORDER BY score DESC
        LIMIT %(lim)s;
        """,
        {"q": search_query.strip(), "lim": limit},
    )
    return [dict(r) for r in rows]


async def search_semantic(search_query: str, limit: int = 10) -> list[dict]:
    """
    Semantic (vector) search — stub.
    pgvector is not yet enabled in the database. When it is, replace
    this with a cosine-similarity query against the embedding column.
    """
    logger.info("search_semantic called but pgvector is not enabled yet. Returning empty.")
    return []


async def search_fuzzy(search_query: str, limit: int = 10) -> list[dict]:
    """
    Fuzzy search — ILIKE fallback.
    When pg_trgm is enabled, replace this with a similarity() query
    and a GiST/GIN trigram index for better performance.
    """
    if not search_query or not search_query.strip():
        return []

    pattern = f"%{search_query.strip()}%"
    rows = await query(
        """
        SELECT
            id,
            title,
            content,
            0.0 AS score
        FROM documents
        WHERE title ILIKE %(p)s OR content ILIKE %(p)s
        LIMIT %(lim)s;
        """,
        {"p": pattern, "lim": limit},
    )
    return [dict(r) for r in rows]


async def hybrid_search(search_query: str, limit: int = 10) -> list[dict]:
    """
    Combines results from full-text, semantic, and fuzzy search.
    Deduplicates by document id and keeps the highest score per document.
    Tolerates failures in individual backends.
    """
    combined: dict[int, dict] = {}

    # Full-text search (primary)
    try:
        for doc in await search_full_text(search_query, limit):
            doc_id = doc["id"]
            doc["source"] = "fulltext"
            combined[doc_id] = doc
    except Exception as e:
        logger.warning("hybrid_search: full-text search failed: %s", e)

    # Semantic search (stub — will be empty until pgvector is active)
    try:
        for doc in await search_semantic(search_query, limit):
            doc_id = doc["id"]
            if doc_id not in combined or doc["score"] > combined[doc_id]["score"]:
                doc["source"] = "semantic"
                combined[doc_id] = doc
    except Exception as e:
        logger.warning("hybrid_search: semantic search failed: %s", e)

    # Fuzzy search (ILIKE fallback)
    try:
        for doc in await search_fuzzy(search_query, limit):
            doc_id = doc["id"]
            if doc_id not in combined:
                doc["source"] = "fuzzy"
                combined[doc_id] = doc
    except Exception as e:
        logger.warning("hybrid_search: fuzzy search failed: %s", e)

    results = sorted(combined.values(), key=lambda d: d.get("score", 0), reverse=True)
    return results[:limit]
