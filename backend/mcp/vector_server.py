import asyncio
import json
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import logging
from dotenv import load_dotenv 
from contextlib import asynccontextmanager
from fastmcp import FastMCP
from db import init_db_pool, close_pool, get_connection


load_dotenv()
MCP_TRANSPORT = os.getenv("MCP_TRANSPORT")
MCP_PORT = int(os.getenv("MCP_PORT"))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger(__name__)

# Initiialises database connection pool on server startup
@asynccontextmanager
async def vector_server_lifespan(server: FastMCP):
    logger.info("Starting up Vector MCP Server")
    success = await init_db_pool()
    if not success:
        logger.warning(
        "Vector server started without a database connection pool." \
        "check DATABASE_URL in .env"
        )
    yield
    logger.info("Shutting down Vector MCP Server")
    await close_pool()

vector_mcp = FastMCP(lifespan=vector_server_lifespan)


@vector_mcp.tool()
async def get_verdensarv_sites() -> str:
    """
    Fetches all Norwegian world heritage sites from the database including their name, protection date and GeoJSON geometry.    
    Use this tool when the user asks about Norwegian world heritage sites, their locations, or details. Always return the full list of sites in the database when asked about world heritage sites, even if the user only asks about one site.
    """
    try: 
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """ 
                    SELECT
                        navn, 
                        vernedato, 
                        informasjon,
                        ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson
                    FROM norges_verdensarv;
                    """
                    )
                rows = await cur.fetchall()
                if not rows:
                    return "No world heritage sites found in database."
                results = [
                    {
                        "navn": row["navn"],
                        "vernedato": row["vernedato"].isoformat() if row["vernedato"] else None,
                        "informasjon": row["informasjon"],
                        "geojson": row["geojson"],
                    }
                    for row in rows
                ]
                return json.dumps(results, ensure_ascii=False) # ensure_ascii=False to preserve Norwegian characters
    except Exception as e:
        logger.error(f"failed to fetch world heritage: {e}")
        return f"Error fetching world heritage sites: {e}"

@vector_mcp.tool()
async def buffer_zone(site_name: str, buffer_radius:float) -> str:
    """
    Creates a buffer zone with a specified radius around a given world heritage site and returns the buffer as GeoJSON. 
    Use this tool when the user asks for a buffer zone around a world heritage site or wants to know what areas would be affected within a certain distance from a site or if the user asks about protected areas. Always return the buffer zone as GeoJSON and do not make any planning recommendations based on the data.
    """
    try:
        async with get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT
                        navn,
                        ST_AsGeoJSON(ST_Transform(ST_Buffer(geom, %s), 4326)) AS buffer_geojson
                    FROM norges_verdensarv
                    WHERE navn = %s;
                    """,
                    (buffer_radius, site_name)
                )
                rows = await cur.fetchall()
                if not rows:
                    return f"No world heritage site found with name '{site_name}'."
                results = [
                    {
                        "navn": row["navn"],
                        "buffer_geojson": row["buffer_geojson"],
                    }
                    for row in rows
                ]
                return json.dumps(results, ensure_ascii=False)
    except Exception as e:
        logger.error(f"failed to create buffer zone: {e}")
        return f"Error creating buffer zone: {e}"




# Example tool, Docstring tells copilot when to call tool and how it works
# @vector_mcp.tool()
# async def example_tool(parameter: str) -> str:
#   """
#    Sentence: What this tool does in one sentence.
#    Sentence: When Copilot should call it. 
#    """
#    pass

if __name__ == "__main__":
    if MCP_TRANSPORT == "http" or MCP_TRANSPORT == "sse":
        vector_mcp.run(transport=MCP_TRANSPORT, port=MCP_PORT)
    else:
        vector_mcp.run(transport=MCP_TRANSPORT) 