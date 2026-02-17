from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from ..dependencies import get_db  # create this next if missing

router = APIRouter(prefix="/api/akb", tags=["AKB"])

@router.get("/progress")
async def get_progress(db: AsyncIOMotorClient = Depends(get_db)):
    # For now: static stub — later query real AKB entries
    return {
        "domains": {
            "projects": 75,
            "kpis": 62,
            "dates": 88,
            "clauses": 45,
            "brand_guidelines": 92,
            "entities": 58
        },
        "overall": 70,
        "threshold_met": False,
        "required": 80
    }
