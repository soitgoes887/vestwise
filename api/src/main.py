from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .db import init_db, close_db
from .routes import health, configs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_db()
        print("Database pool initialized successfully")
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        raise
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="Vestwise API",
    description="Backend API for Vestwise financial planning tool",
    version="1.0.0",
    lifespan=lifespan,
)


# Global exception handler to return detailed errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled exception: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


# CORS middleware
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [
        "https://vestwise.co.uk",
        "https://www.vestwise.co.uk",
        "https://dev.vestwise.co.uk",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api")
app.include_router(configs.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
