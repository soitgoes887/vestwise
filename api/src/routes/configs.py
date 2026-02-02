from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
import json
import traceback

from ..middleware.auth import get_current_user
from ..models.config import ConfigCreate, ConfigUpdate, ConfigResponse
from ..db import get_connection

router = APIRouter(prefix="/configs", tags=["configs"])


async def ensure_user_exists(conn, user: dict):
    """Create user record if it doesn't exist (first-time login)."""
    await conn.execute(
        """
        INSERT INTO users (id, email)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET email = $2
        """,
        UUID(user["id"]),
        user["email"],
    )


@router.get("", response_model=list[ConfigResponse])
async def list_configs(
    config_type: str | None = None,
    user: dict = Depends(get_current_user),
):
    """List all configs for the authenticated user."""
    try:
        async with get_connection() as conn:
            if config_type:
                rows = await conn.fetch(
                    """
                    SELECT id, user_id, config_type, name, config_data, is_default, created_at, updated_at
                    FROM user_configs
                    WHERE user_id = $1 AND config_type = $2
                    ORDER BY is_default DESC, updated_at DESC
                    """,
                    UUID(user["id"]),
                    config_type,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, user_id, config_type, name, config_data, is_default, created_at, updated_at
                    FROM user_configs
                    WHERE user_id = $1
                    ORDER BY config_type, is_default DESC, updated_at DESC
                    """,
                    UUID(user["id"]),
                )

            return [
                ConfigResponse(
                    id=row["id"],
                    user_id=row["user_id"],
                    config_type=row["config_type"],
                    name=row["name"],
                    config_data=json.loads(row["config_data"]),
                    is_default=row["is_default"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                for row in rows
            ]
    except Exception as e:
        print(f"Error in list_configs: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/{config_id}", response_model=ConfigResponse)
async def get_config(
    config_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get a specific config by ID."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, user_id, config_type, name, config_data, is_default, created_at, updated_at
            FROM user_configs
            WHERE id = $1 AND user_id = $2
            """,
            config_id,
            UUID(user["id"]),
        )

        if not row:
            raise HTTPException(status_code=404, detail="Config not found")

        return ConfigResponse(
            id=row["id"],
            user_id=row["user_id"],
            config_type=row["config_type"],
            name=row["name"],
            config_data=json.loads(row["config_data"]),
            is_default=row["is_default"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )


@router.post("", response_model=ConfigResponse, status_code=201)
async def create_config(
    config: ConfigCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new config."""
    try:
        async with get_connection() as conn:
            async with conn.transaction():
                # Ensure user exists
                await ensure_user_exists(conn, user)

                user_id = UUID(user["id"])

                # If this is set as default, unset other defaults of same type
                if config.is_default:
                    await conn.execute(
                        """
                        UPDATE user_configs
                        SET is_default = FALSE
                        WHERE user_id = $1 AND config_type = $2
                        """,
                        user_id,
                        config.config_type,
                    )

                row = await conn.fetchrow(
                    """
                    INSERT INTO user_configs (user_id, config_type, name, config_data, is_default)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, user_id, config_type, name, config_data, is_default, created_at, updated_at
                    """,
                    user_id,
                    config.config_type,
                    config.name,
                    json.dumps(config.config_data),
                    config.is_default,
                )

                return ConfigResponse(
                    id=row["id"],
                    user_id=row["user_id"],
                    config_type=row["config_type"],
                    name=row["name"],
                    config_data=json.loads(row["config_data"]),
                    is_default=row["is_default"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
    except Exception as e:
        print(f"Error in create_config: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.put("/{config_id}", response_model=ConfigResponse)
async def update_config(
    config_id: UUID,
    config: ConfigUpdate,
    user: dict = Depends(get_current_user),
):
    """Update an existing config."""
    async with get_connection() as conn:
        async with conn.transaction():
            # Check ownership
            existing = await conn.fetchrow(
                "SELECT config_type FROM user_configs WHERE id = $1 AND user_id = $2",
                config_id,
                UUID(user["id"]),
            )

            if not existing:
                raise HTTPException(status_code=404, detail="Config not found")

            # If setting as default, unset other defaults
            if config.is_default:
                await conn.execute(
                    """
                    UPDATE user_configs
                    SET is_default = FALSE
                    WHERE user_id = $1 AND config_type = $2 AND id != $3
                    """,
                    UUID(user["id"]),
                    existing["config_type"],
                    config_id,
                )

            # Build update query dynamically
            updates = ["updated_at = NOW()"]
            params = [config_id, UUID(user["id"])]
            param_idx = 3

            if config.name is not None:
                updates.append(f"name = ${param_idx}")
                params.append(config.name)
                param_idx += 1

            if config.config_data is not None:
                updates.append(f"config_data = ${param_idx}")
                params.append(json.dumps(config.config_data))
                param_idx += 1

            if config.is_default is not None:
                updates.append(f"is_default = ${param_idx}")
                params.append(config.is_default)
                param_idx += 1

            query = f"""
                UPDATE user_configs
                SET {', '.join(updates)}
                WHERE id = $1 AND user_id = $2
                RETURNING id, user_id, config_type, name, config_data, is_default, created_at, updated_at
            """

            row = await conn.fetchrow(query, *params)

            return ConfigResponse(
                id=row["id"],
                user_id=row["user_id"],
                config_type=row["config_type"],
                name=row["name"],
                config_data=json.loads(row["config_data"]),
                is_default=row["is_default"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )


@router.delete("/{config_id}", status_code=204)
async def delete_config(
    config_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a config."""
    async with get_connection() as conn:
        result = await conn.execute(
            "DELETE FROM user_configs WHERE id = $1 AND user_id = $2",
            config_id,
            UUID(user["id"]),
        )

        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Config not found")
