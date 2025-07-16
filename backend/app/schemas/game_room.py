from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GameRoomBase(BaseModel):
    name: str
    is_private: bool = False
    password: Optional[str] = None
    max_players: int = 8
    time_limit: int = 60
    max_rounds: int = 5


class GameRoomCreate(GameRoomBase):
    pass


class GameRoomJoin(BaseModel):
    room_code: str
    password: Optional[str] = None


class GameRoomResponse(GameRoomBase):
    id: int
    room_code: str
    current_players: int
    is_active: bool
    created_by: int
    created_at: datetime
    current_word: Optional[str] = None
    current_drawer_id: Optional[int] = None
    round_number: int
    game_started: bool
    
    class Config:
        from_attributes = True


class GameState(BaseModel):
    room_id: int
    current_word: Optional[str] = None
    current_drawer_id: Optional[int] = None
    round_number: int
    max_rounds: int
    time_remaining: int
    game_started: bool
    players: List[dict] 