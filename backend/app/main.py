import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1.endpoints import auth, users, requests, brigades, reports
from app.db.database import engine, Base
from app.models import user, request, brigade, report  # noqa: F401
from app.schemas.request import _rebuild_request_out

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Розв'язуємо forward reference RequestOut → ReportOut
_rebuild_request_out()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Demining System API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

app.include_router(auth.router,    prefix="/api")
app.include_router(users.router,   prefix="/api")
app.include_router(requests.router,prefix="/api")
app.include_router(brigades.router,prefix="/api")
app.include_router(reports.router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
async def root():
    return {"status": "ok", "version": "1.0.0"}
