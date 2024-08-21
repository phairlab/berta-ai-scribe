from fastapi import APIRouter

import app.services.snowflake as snowflake_service
from app.config import get_app_logger

logger = get_app_logger(__name__)

router = APIRouter()

@router.get("")
async def get_note_instructions(user: snowflake_service.UserAgent):
    pass