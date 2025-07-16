from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class GameRoom(Base):
    __tablename__ = "game_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    is_private = Column(Boolean, default=False)
    password = Column(String, nullable=True)  # For private rooms
    max_players = Column(Integer, default=8)
    current_players = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, nullable=False)  # User ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Game state
    current_word = Column(String, nullable=True)
    current_drawer_id = Column(Integer, nullable=True)
    round_number = Column(Integer, default=0)
    max_rounds = Column(Integer, default=5)
    time_limit = Column(Integer, default=60)  # seconds
    game_started = Column(Boolean, default=False)
    
    # Relationships
    sessions = relationship("GameSession", back_populates="room") 