from fastapi import APIRouter, Depends
import asyncpg

from ..db import get_connection

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy"}


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check - verifies database connectivity.
    """
    try:
        async with get_connection() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return {"status": "not ready", "database": str(e)}
