from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.user import User
from ..models.player_stats import PlayerStats
from ..schemas.user import UserCreate, UserLogin
from ..core.security import get_password_hash, verify_password, create_access_token
from typing import Optional


class UserService:
    """Service for user authentication and management"""
    
    @staticmethod
    def create_user(db: Session, user: UserCreate) -> User:
        """Create a new user"""
        # Check if username already exists
        if db.query(User).filter(User.username == user.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email already exists
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        hashed_password = get_password_hash(user.password)
        db_user = User(
            username=user.username,
            email=user.email,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create player stats for the new user
        player_stats = PlayerStats(user_id=db_user.id)
        db.add(player_stats)
        db.commit()
        
        return db_user
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate a user"""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def login_user(db: Session, user_credentials: UserLogin):
        """Login a user and return access token"""
        user = UserService.authenticate_user(db, user_credentials.username, user_credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def get_user_stats(db: Session, user_id: int) -> Optional[PlayerStats]:
        """Get user's player statistics"""
        return db.query(PlayerStats).filter(PlayerStats.user_id == user_id).first()
    
    @staticmethod
    def update_user_stats(db: Session, user_id: int, **kwargs):
        """Update user's player statistics"""
        stats = db.query(PlayerStats).filter(PlayerStats.user_id == user_id).first()
        if stats:
            for key, value in kwargs.items():
                if hasattr(stats, key):
                    setattr(stats, key, value)
            db.commit()
            db.refresh(stats)
        return stats 