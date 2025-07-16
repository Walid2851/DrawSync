import random
import string
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.game_room import GameRoom
from ..models.game_session import GameSession
from ..models.user import User
from ..schemas.game_room import GameRoomCreate, GameRoomJoin
from ..config import settings
from typing import List, Optional


class RoomService:
    """Service for game room management"""
    
    @staticmethod
    def generate_room_code() -> str:
        """Generate a unique 6-character room code"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    @staticmethod
    def create_room(db: Session, room_data: GameRoomCreate, created_by: int) -> GameRoom:
        """Create a new game room"""
        # Generate unique room code
        room_code = RoomService.generate_room_code()
        while db.query(GameRoom).filter(GameRoom.room_code == room_code).first():
            room_code = RoomService.generate_room_code()
        
        # Create room
        db_room = GameRoom(
            room_code=room_code,
            name=room_data.name,
            is_private=room_data.is_private,
            password=room_data.password if room_data.is_private else None,
            max_players=room_data.max_players,
            time_limit=room_data.time_limit,
            max_rounds=room_data.max_rounds,
            created_by=created_by
        )
        db.add(db_room)
        db.commit()
        db.refresh(db_room)
        return db_room
    
    @staticmethod
    def join_room(db: Session, join_data: GameRoomJoin, user_id: int) -> GameSession:
        """Join a game room"""
        # Find room by code
        room = db.query(GameRoom).filter(GameRoom.room_code == join_data.room_code).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Check if room is full
        if room.current_players >= room.max_players:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room is full"
            )
        
        # Check password for private rooms
        if room.is_private and room.password != join_data.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect room password"
            )
        
        # Check if user is already in the room
        existing_session = db.query(GameSession).filter(
            GameSession.user_id == user_id,
            GameSession.room_id == room.id,
            GameSession.left_at.is_(None)
        ).first()
        
        if existing_session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already in this room"
            )
        
        # Create session
        import secrets
        session_token = secrets.token_urlsafe(32)
        
        db_session = GameSession(
            user_id=user_id,
            room_id=room.id,
            session_token=session_token
        )
        db.add(db_session)
        
        # Update room player count
        room.current_players += 1
        db.commit()
        db.refresh(db_session)
        
        return db_session
    
    @staticmethod
    def leave_room(db: Session, user_id: int, room_id: int):
        """Leave a game room"""
        session = db.query(GameSession).filter(
            GameSession.user_id == user_id,
            GameSession.room_id == room_id,
            GameSession.left_at.is_(None)
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Mark session as left
        from datetime import datetime
        session.left_at = datetime.utcnow()
        
        # Update room player count
        room = db.query(GameRoom).filter(GameRoom.id == room_id).first()
        if room and room.current_players > 0:
            room.current_players -= 1
        
        db.commit()
        return {"message": "Left room successfully"}
    
    @staticmethod
    def get_room_by_code(db: Session, room_code: str) -> Optional[GameRoom]:
        """Get room by room code"""
        return db.query(GameRoom).filter(GameRoom.room_code == room_code).first()
    
    @staticmethod
    def get_room_by_id(db: Session, room_id: int) -> Optional[GameRoom]:
        """Get room by ID"""
        return db.query(GameRoom).filter(GameRoom.id == room_id).first()
    
    @staticmethod
    def get_public_rooms(db: Session) -> List[GameRoom]:
        """Get all public rooms that are not full"""
        # First, clean up full rooms
        RoomService.delete_full_rooms(db)
        
        # Return only active, public rooms that are not full
        return db.query(GameRoom).filter(
            GameRoom.is_private == False,
            GameRoom.is_active == True,
            GameRoom.current_players < GameRoom.max_players
        ).all()
    
    @staticmethod
    def get_room_players(db: Session, room_id: int) -> List[dict]:
        """Get all players in a room with user information"""
        sessions = db.query(GameSession).filter(
            GameSession.room_id == room_id,
            GameSession.left_at.is_(None)
        ).all()
        
        players = []
        for session in sessions:
            # Get user information
            user = db.query(User).filter(User.id == session.user_id).first()
            if user:
                players.append({
                    'id': session.id,
                    'user_id': session.user_id,
                    'username': user.username,
                    'is_ready': session.is_ready,
                    'score': session.score,
                    'joined_at': session.joined_at
                })
        
        return players
    
    @staticmethod
    def update_room_state(db: Session, room_id: int, **kwargs):
        """Update room state"""
        room = db.query(GameRoom).filter(GameRoom.id == room_id).first()
        if room:
            for key, value in kwargs.items():
                if hasattr(room, key):
                    setattr(room, key, value)
            db.commit()
            db.refresh(room)
        return room

    @staticmethod
    def delete_full_rooms(db: Session):
        """Delete rooms that are at maximum capacity"""
        full_rooms = db.query(GameRoom).filter(
            GameRoom.current_players >= GameRoom.max_players,
            GameRoom.is_active == True
        ).all()
        
        deleted_count = 0
        for room in full_rooms:
            # Mark room as inactive instead of deleting to preserve data
            room.is_active = False
            deleted_count += 1
        
        if deleted_count > 0:
            db.commit()
            print(f"Auto-deleted {deleted_count} full rooms")
        
        return deleted_count

    @staticmethod
    def cleanup_inactive_rooms(db: Session, hours_old: int = 24):
        """Delete inactive rooms that are older than specified hours"""
        from datetime import datetime, timedelta
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_old)
        inactive_rooms = db.query(GameRoom).filter(
            GameRoom.is_active == False,
            GameRoom.created_at < cutoff_time
        ).all()
        
        deleted_count = 0
        for room in inactive_rooms:
            db.delete(room)
            deleted_count += 1
        
        if deleted_count > 0:
            db.commit()
            print(f"Cleaned up {deleted_count} old inactive rooms")
        
        return deleted_count 