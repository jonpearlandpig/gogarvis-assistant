from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from .routers import akb, v1

app = FastAPI(title="Garvis Sovereign Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # Vite default dev port
        "http://127.0.0.1:5173",
        "*"                          # temp for dev — tighten later
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "env": "dev"
    }

app.include_router(akb.router)
app.include_router(v1.router)
