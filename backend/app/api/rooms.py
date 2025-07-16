from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.game_room import GameRoomCreate, GameRoomResponse, GameRoomJoin
from ..schemas.game_session import GameSessionResponse
from ..services.room_service import RoomService
from ..core.security import get_current_active_user
from ..models.user import User

router = APIRouter(prefix="/rooms", tags=["Game Rooms"])


@router.post("/", response_model=GameRoomResponse)
def create_room(
    room_data: GameRoomCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new game room"""
    return RoomService.create_room(db, room_data, current_user.id)


@router.post("/join", response_model=GameSessionResponse)
def join_room(
    join_data: GameRoomJoin,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Join a game room"""
    return RoomService.join_room(db, join_data, current_user.id)


@router.post("/{room_id}/leave")
def leave_room(
    room_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Leave a game room"""
    return RoomService.leave_room(db, current_user.id, room_id)


@router.get("/", response_model=List[GameRoomResponse])
def get_public_rooms(db: Session = Depends(get_db)):
    """Get all public rooms"""
    return RoomService.get_public_rooms(db)


@router.get("/{room_code}", response_model=GameRoomResponse)
def get_room_by_code(room_code: str, db: Session = Depends(get_db)):
    """Get room information by room code"""
    room = RoomService.get_room_by_code(db, room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.get("/{room_id}/players")
def get_room_players(room_id: int, db: Session = Depends(get_db)):
    """Get all players in a room"""
    players = RoomService.get_room_players(db, room_id)
    return {"players": players}


@router.post("/cleanup")
def cleanup_rooms(db: Session = Depends(get_db)):
    """Clean up full and old inactive rooms"""
    full_rooms_deleted = RoomService.delete_full_rooms(db)
    old_rooms_deleted = RoomService.cleanup_inactive_rooms(db, hours_old=24)
    
    return {
        "message": "Room cleanup completed",
        "full_rooms_deleted": full_rooms_deleted,
        "old_rooms_deleted": old_rooms_deleted
    } 