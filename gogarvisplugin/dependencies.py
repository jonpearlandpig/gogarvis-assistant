from motor.motor_asyncio import AsyncIOMotorClient
import os

def get_db():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    return client[os.getenv("DATABASE_NAME", "garvis_dev")]
