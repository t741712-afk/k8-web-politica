from fastapi import APIRouter
from app.services.stats import get_portal_stats

router = APIRouter()


@router.get("")
def get_stats():
    return get_portal_stats()
