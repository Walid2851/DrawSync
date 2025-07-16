import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.game_room import GameRoom
from ..models.game_session import GameSession
from ..models.player_stats import PlayerStats
from ..core.words import word_manager
from ..config import settings
from ..database import SessionLocal
from typing import List, Dict, Optional
import json


class GameService:
    """Service for game logic and state management"""
    
    def __init__(self):
        self.active_games = {}  # room_id -> game_state
        self.game_timers = {}   # room_id -> timer_task
    
    def serialize_game_state(self, game_state: Dict) -> Dict:
        """Serialize game state for sending to clients (removes datetime objects)"""
        if not game_state:
            return {}
        
        serialized = {
            "room_id": game_state.get("room_id"),
            "players": game_state.get("players", []),
            "current_round": game_state.get("current_round", 1),
            "max_rounds": game_state.get("max_rounds", 5),
            "current_drawer_index": game_state.get("current_drawer_index", 0),
            "current_word": game_state.get("current_word"),
            "time_remaining": game_state.get("time_remaining", 60),
            "game_started": game_state.get("game_started", False),
            "guessed_players": list(game_state.get("guessed_players", set())),
            "drawing_data": game_state.get("drawing_data", [])
        }
        
        # Add current drawer ID for convenience
        if game_state.get("players") and game_state.get("current_drawer_index") is not None:
            drawer_index = game_state["current_drawer_index"]
            if drawer_index < len(game_state["players"]):
                serialized["current_drawer_id"] = game_state["players"][drawer_index]["id"]
        
        return serialized
    
    async def start_game(self, db: Session, room_id: int):
        """Start a new game in a room"""
        room = db.query(GameRoom).filter(GameRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # Get all players in the room
        players = db.query(GameSession).filter(
            GameSession.room_id == room_id,
            GameSession.left_at.is_(None)
        ).all()
        
        if len(players) < settings.MIN_PLAYERS_TO_START:
            raise HTTPException(
                status_code=400, 
                detail=f"Need at least {settings.MIN_PLAYERS_TO_START} players to start"
            )
        
        # Initialize game state
        game_state = {
            "room_id": room_id,
            "players": [{"id": p.user_id, "score": 0, "ready": p.is_ready} for p in players],
            "current_round": 1,
            "max_rounds": room.max_rounds,
            "current_drawer_index": 0,
            "current_word": None,
            "time_remaining": room.time_limit,
            "game_started": True,
            "round_start_time": datetime.utcnow(),
            "guessed_players": set(),
            "drawing_data": []
        }
        
        self.active_games[room_id] = game_state
        
        # Update room state
        room.game_started = True
        room.round_number = 1
        db.commit()
        
        # Start first round
        await self.start_round(db, room_id)
        
        return self.serialize_game_state(game_state)
    
    async def start_round(self, db: Session, room_id: int):
        """Start a new round"""
        if room_id not in self.active_games:
            return
        
        game_state = self.active_games[room_id]
        room = db.query(GameRoom).filter(GameRoom.id == room_id).first()
        
        if not room:
            return
        
        # Assign word to current drawer
        current_drawer_id = game_state["players"][game_state["current_drawer_index"]]["id"]
        word = word_manager.get_random_word()
        
        game_state["current_word"] = word
        game_state["time_remaining"] = room.time_limit
        game_state["round_start_time"] = datetime.utcnow()
        game_state["guessed_players"] = set()
        game_state["drawing_data"] = []
        
        # Update room state
        room.current_word = word
        room.current_drawer_id = current_drawer_id
        room.round_number = game_state["current_round"]
        db.commit()
        
        # Start timer for this round
        self.start_round_timer(room_id, room.time_limit)
        
        return self.serialize_game_state(game_state)
    
    def start_round_timer(self, room_id: int, duration: int):
        """Start a timer for the current round"""
        # Cancel existing timer if any
        if room_id in self.game_timers:
            self.game_timers[room_id].cancel()
        
        # Create new timer
        async def round_timer():
            try:
                await asyncio.sleep(duration)
                await self.end_round(room_id)
            except asyncio.CancelledError:
                print(f"Timer cancelled for room {room_id}")
            except Exception as e:
                print(f"Error in timer for room {room_id}: {e}")
        
        self.game_timers[room_id] = asyncio.create_task(round_timer())
    
    async def end_round(self, room_id: int):
        """End the current round"""
        if room_id not in self.active_games:
            return
        
        game_state = self.active_games[room_id]
        
        # Calculate scores for this round
        await self.calculate_round_scores(room_id)
        
        # Move to next round or end game
        game_state["current_round"] += 1
        game_state["current_drawer_index"] = (game_state["current_drawer_index"] + 1) % len(game_state["players"])
        
        if game_state["current_round"] > game_state["max_rounds"]:
            await self.end_game(room_id)
        else:
            # Start next round after a short delay
            await asyncio.sleep(3)
            db = SessionLocal()
            try:
                await self.start_round(db, room_id)
            finally:
                db.close()
    
    async def end_game(self, room_id: int):
        """End the game and calculate final scores"""
        if room_id not in self.active_games:
            return
        
        game_state = self.active_games[room_id]
        
        # Update player statistics
        await self.update_player_stats(room_id)
        
        # Clean up
        if room_id in self.game_timers:
            self.game_timers[room_id].cancel()
            del self.game_timers[room_id]
        
        del self.active_games[room_id]
        
        return self.serialize_game_state(game_state)
    
    async def calculate_round_scores(self, room_id: int):
        """Calculate scores for the current round"""
        if room_id not in self.active_games:
            return
        
        game_state = self.active_games[room_id]
        time_elapsed = (datetime.utcnow() - game_state["round_start_time"]).total_seconds()
        
        # Calculate scores based on time taken to guess
        for player_id in game_state["guessed_players"]:
            # Score decreases as time increases
            time_bonus = max(0, game_state["time_remaining"] - time_elapsed)
            score = int(100 + time_bonus)
            
            # Update player score
            for player in game_state["players"]:
                if player["id"] == player_id:
                    player["score"] += score
                    break
    
    async def update_player_stats(self, room_id: int):
        """Update player statistics after game ends"""
        if room_id not in self.active_games:
            return
        
        game_state = self.active_games[room_id]
        
        # This would typically update the database
        # For now, we'll just log the final scores
        print(f"Game ended for room {room_id}")
        for player in game_state["players"]:
            print(f"Player {player['id']}: {player['score']} points")
    
    def submit_guess(self, room_id: int, user_id: int, guess: str) -> Dict:
        """Submit a word guess"""
        if room_id not in self.active_games:
            return {"correct": False, "message": "Game not found"}
        
        game_state = self.active_games[room_id]
        current_word = game_state["current_word"]
        
        if not current_word:
            return {"correct": False, "message": "No word assigned"}
        
        # Check if player already guessed
        if user_id in game_state["guessed_players"]:
            return {"correct": False, "message": "Already guessed"}
        
        # Check if guess is correct
        if guess.lower().strip() == current_word.lower():
            game_state["guessed_players"].add(user_id)
            return {"correct": True, "message": "Correct guess!"}
        else:
            return {"correct": False, "message": "Incorrect guess"}
    
    def add_drawing_data(self, room_id: int, drawing_data: Dict):
        """Add drawing data to the current round"""
        if room_id not in self.active_games:
            return
        
        game_state = self.active_games[room_id]
        game_state["drawing_data"].append(drawing_data)
    
    def get_game_state(self, room_id: int) -> Optional[Dict]:
        """Get current game state"""
        game_state = self.active_games.get(room_id)
        if game_state:
            return self.serialize_game_state(game_state)
        return None
    
    def get_public_rooms(self, db: Session) -> List[Dict]:
        """Get all public rooms with basic info"""
        rooms = db.query(GameRoom).filter(
            GameRoom.is_private == False,
            GameRoom.is_active == True
        ).all()
        
        return [
            {
                "id": room.id,
                "name": room.name,
                "room_code": room.room_code,
                "current_players": room.current_players,
                "max_players": room.max_players,
                "game_started": room.game_started
            }
            for room in rooms
        ]


# Global game service instance
game_service = GameService() 