from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from ..database import get_db
from ..schemas.game_session import DrawingData, ChatMessage, WordGuess
from ..services.game_service import game_service
from ..core.security import get_current_active_user
from ..models.user import User

router = APIRouter(prefix="/games", tags=["Game Logic"])


@router.post("/{room_id}/start")
async def start_game(
    room_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Start a new game in a room"""
    return await game_service.start_game(db, room_id)


@router.get("/{room_id}/state")
def get_game_state(room_id: int):
    """Get current game state"""
    state = game_service.get_game_state(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="Game not found")
    return state


@router.post("/{room_id}/draw")
def submit_drawing(
    room_id: int,
    drawing_data: DrawingData,
    current_user: User = Depends(get_current_active_user)
):
    """Submit drawing data"""
    game_service.add_drawing_data(room_id, {
        "user_id": current_user.id,
        "x": drawing_data.x,
        "y": drawing_data.y,
        "is_drawing": drawing_data.is_drawing,
        "color": drawing_data.color,
        "brush_size": drawing_data.brush_size
    })
    return {"message": "Drawing data received"}


@router.post("/{room_id}/guess")
def submit_guess(
    room_id: int,
    guess_data: WordGuess,
    current_user: User = Depends(get_current_active_user)
):
    """Submit a word guess"""
    result = game_service.submit_guess(room_id, current_user.id, guess_data.guess)
    return result


@router.get("/rooms/public")
def get_public_rooms(db: Session = Depends(get_db)):
    """Get all public rooms with basic info"""
    return game_service.get_public_rooms(db) 