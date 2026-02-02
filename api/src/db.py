import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from .config import get_settings

pool: asyncpg.Pool | None = None


async def init_db():
    global pool
    settings = get_settings()
    pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=2,
        max_size=10,
    )


async def close_db():
    global pool
    if pool:
        await pool.close()


@asynccontextmanager
async def get_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    global pool
    if not pool:
        raise RuntimeError("Database pool not initialized")
    async with pool.acquire() as connection:
        yield connection


async def get_db() -> asyncpg.Connection:
    global pool
    if not pool:
        raise RuntimeError("Database pool not initialized")
    return await pool.acquire()
