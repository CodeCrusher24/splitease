from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, groups, expenses
from app.core.config import settings
from app.routers import auth, groups  # <-- Add groups here

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(groups.router, prefix=settings.API_V1_PREFIX)  # <-- Register
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(groups.router, prefix=settings.API_V1_PREFIX)
app.include_router(expenses.router, prefix=settings.API_V1_PREFIX)
@app.get("/health", tags=["meta"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/", tags=["meta"])
def root() -> dict[str, str]:
    return {"app": settings.APP_NAME, "docs": "/docs"}
