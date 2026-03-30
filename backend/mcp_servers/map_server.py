"""
Tools:
  - draw_shape: Draw a GeoJSON shape on the map with a given layer name.
"""

import logging
from fastmcp import FastMCP

logger = logging.getLogger(__name__)

mcp = FastMCP("map_server")

_pending_shapes: dict[str, list] = {}


def get_and_clear_shapes(session_id: str) -> list:
    return _pending_shapes.pop(session_id, [])


@mcp.tool()
def draw_shape(geojson: dict, layer_name: str, session_id: str = "") -> dict:
    """
    Draw a shape on the map.

    geojson: a valid GeoJSON Feature or FeatureCollection representing the shape(s) to draw.
    layer_name: the display name to give the layer on the map.
    session_id: the current session ID, used to route the shape to the correct user.
    """
    logger.info("draw_shape called: layer_name=%s session_id=%s", layer_name, session_id)
    if session_id:
        _pending_shapes.setdefault(session_id, []).append({
            "layer_name": layer_name,
            "geojson": geojson,
        })
    return {"status": "ok", "layer_name": layer_name}


map_app = mcp.http_app(path="/mcp")
