from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GameSessionBase(BaseModel):
    room_id: int
    is_ready: bool = False
    score: int = 0


class GameSessionResponse(GameSessionBase):
    id: int
    user_id: int
    session_token: str
    joined_at: datetime
    left_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DrawingData(BaseModel):
    room_id: int
    x: float
    y: float
    is_drawing: bool
    color: str = "#000000"
    brush_size: int = 2


class ChatMessage(BaseModel):
    room_id: int
    message: str
    user_id: int
    username: str


class WordGuess(BaseModel):
    room_id: int
    guess: str
    user_id: int 