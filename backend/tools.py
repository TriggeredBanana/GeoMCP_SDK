from copilot import Tool
from db import query
import json

async def handle_list_kommuner(invocation):
    search = invocation["arguments"].get("search", "")
    if search:
        result = await query(
            "SELECT identifier, description FROM kulturmiljoer.kommunenummer WHERE identifier ILIKE %s OR description ILIKE %s ORDER BY identifier ASC",
            (f"%{search}%", f"%{search}%")
        )
    else:
        result = await query(
            "SELECT identifier, description FROM kulturmiljoer.kommunenummer ORDER BY identifier ASC"
        )
    return {
        "textResultForLlm": str(result),
        "resultType": "success"
    }
    
list_kommuner_tool = Tool(
    name="list_kommuner",
    description="List kommunenummer og kommunenavn. Kan filtreres med søkeord.",
    parameters={
        "type": "object",
        "properties": {
            "search": {
                "type": "string",
                "description": "Søkeord for å filtrere på nummer eller navn"
            }
        },
        "required": []
    },
    handler=handle_list_kommuner
)

async def handle_list_vernetyper(invocation):
    result = await query(
        "SELECT identifier, description FROM kulturmiljoer.vernetype ORDER BY identifier ASC"
    )
    return {
        "textResultForLlm": str(result),
        "resultType": "success"
    }
    
list_vernetyper_tool = Tool(
    name="list_vernetyper",
    description="List alle vernetyper for kulturmiljøer.",
    parameters={
        "type": "object",
        "properties": {},
        "required": []
    },
    handler=handle_list_vernetyper
)

import json

async def handle_buffer_search(invocation):
    lat = invocation["arguments"]["latitude"]
    lon = invocation["arguments"]["longitude"]
    distance = invocation["arguments"].get("distance", 1000)

    print(f"BUFFER SEARCH: lat={lat}, lon={lon}, distance={distance}")

    try:
        result = await query("""
            SELECT k.objid, k.navn, k.kulturmiljokategori, k.vernetype,
                   k.informasjon,
                   ST_Distance(
                       k.omrade,
                       ST_Transform(ST_SetSRID(ST_MakePoint(%s, %s), 4326), 25833)
                   ) as avstand_meter,
                   ST_AsGeoJSON(ST_Transform(k.omrade, 4326)) as geojson
            FROM kulturmiljoer.kulturmiljo k
            WHERE ST_DWithin(
                k.omrade,
                ST_Transform(ST_SetSRID(ST_MakePoint(%s, %s), 4326), 25833),
                %s
            )
            ORDER BY avstand_meter ASC
        """, (lon, lat, lon, lat, distance))

        features = []
        for row in result:
            geometry = json.loads(row["geojson"]) if row["geojson"] else None
            properties = {k: v for k, v in row.items() if k != "geojson"}
            features.append({
                "type": "Feature",
                "geometry": geometry,
                "properties": properties
            })

        feature_collection = {
            "type": "FeatureCollection",
            "features": features
        }

        print(f"BUFFER RESULT: {len(result)} rows")
        return {
            "textResultForLlm": json.dumps(feature_collection, ensure_ascii=False),
            "resultType": "success"
        }
    except Exception as e:
        print(f"BUFFER ERROR: {e}")
        return {
            "textResultForLlm": f"Feil ved søk: {str(e)}",
            "resultType": "error"
        }
        
buffer_search_tool = Tool(
    name="buffer_search",
    description="Finn kulturmiljøer innenfor en gitt avstand fra et punkt. Tar koordinater (latitude/longitude) og avstand i meter.",
    parameters={
        "type": "object",
        "properties": {
            "latitude": {
                "type": "number",
                "description": "Breddegrad (latitude), f.eks. 58.1599 for Kristiansand"
            },
            "longitude": {
                "type": "number",
                "description": "Lengdegrad (longitude), f.eks. 8.0182 for Kristiansand"
            },
            "distance": {
                "type": "number",
                "description": "Søkeradius i meter. Standard er 1000m."
            }
        },
        "required": ["latitude", "longitude"]
    },
    handler=handle_buffer_search
)