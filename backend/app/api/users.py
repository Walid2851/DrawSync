from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.player_stats import PlayerStatsResponse, LeaderboardEntry
from ..services.user_service import UserService
from ..core.security import get_current_active_user
from ..models.user import User
from ..models.player_stats import PlayerStats

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("/stats", response_model=PlayerStatsResponse)
def get_user_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's statistics"""
    stats = UserService.get_user_stats(db, current_user.id)
    if not stats:
        raise HTTPException(status_code=404, detail="Stats not found")
    return stats


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(db: Session = Depends(get_db), limit: int = 10):
    """Get top players leaderboard"""
    stats = db.query(PlayerStats).order_by(PlayerStats.total_score.desc()).limit(limit).all()
    
    leaderboard = []
    for i, stat in enumerate(stats):
        user = UserService.get_user_by_id(db, stat.user_id)
        if user:
            leaderboard.append(LeaderboardEntry(
                username=user.username,
                total_score=stat.total_score,
                games_played=stat.games_played,
                average_score=stat.average_score,
                rank=i + 1
            ))
    
    return leaderboard 