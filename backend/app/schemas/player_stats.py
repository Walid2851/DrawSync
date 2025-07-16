from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PlayerStatsBase(BaseModel):
    games_played: int = 0
    games_won: int = 0
    total_score: int = 0
    words_guessed: int = 0
    words_drawn: int = 0
    average_score: int = 0
    total_play_time: int = 0


class PlayerStatsResponse(PlayerStatsBase):
    id: int
    user_id: int
    last_played: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    username: str
    total_score: int
    games_played: int
    average_score: int
    rank: int 