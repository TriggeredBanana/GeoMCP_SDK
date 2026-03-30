# MCP Servers package
#
# Current servers (mounted in server.py):
#   - db_server.py    — raw SQL / schema exploration
#   - geo_server.py   — KU domain tools (buffer search, kommuner, vernetyper)
#   - docs_server.py  — Azure Blob PDF tools
#   - vector_server.py  — PostGIS / Shapely spatial analysis tools
#   - search_server.py  — Document search (full-text, fuzzy, hybrid)
#
# Planned (separate Docker containers, registered via env vars in session_manager.py):
#   - postgis_raster  — PostGIS raster analysis tools