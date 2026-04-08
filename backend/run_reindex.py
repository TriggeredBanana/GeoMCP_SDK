"""Force-reindex all documents from Azure Blob Storage."""

import asyncio
import sys

from dotenv import load_dotenv
load_dotenv()

from db import init_db_pool, close_pool
from ingest_pipeline import run_pipeline


async def main():
    await init_db_pool()
    result = await run_pipeline(force=True)
    print(result)
    await close_pool()


if sys.platform == "win32":
    asyncio.run(main(), loop_factory=asyncio.SelectorEventLoop)
else:
    asyncio.run(main())