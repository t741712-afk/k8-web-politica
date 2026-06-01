from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.chat import router as chat_router
from app.routes.files import router as files_router
from app.routes.stats import router as stats_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api/chat")
app.include_router(files_router, prefix="/api/files")
app.include_router(stats_router, prefix="/api/stats")


@app.get("/")
def root():
    return {"status": "ok", "app": "ppf-ai-backend"}
