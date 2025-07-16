import socket
import threading
import json
import time
import select
from typing import Dict, List, Set, Optional
from .config import settings
from .services.game_service import game_service
from .database import SessionLocal
from .models.user import User
from .models.game_session import GameSession
from .core.security import verify_token

class DrawSyncSocketServer:
    """Raw Python socket server for DrawSync game"""
    
    def __init__(self, host='localhost', port=8001):
        self.host = host
        self.port = port
        self.server_socket = None
        self.clients: Dict[str, Dict] = {}  # client_id -> client_info
        self.rooms: Dict[int, Set[str]] = {}  # room_id -> set of client_ids
        self.running = False
        self.client_lock = threading.Lock()
        
    def start(self):
        """Start the socket server"""
        try:
            # Create server socket
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            self.server_socket.setblocking(False)
            
            self.running = True
            print(f"🎮 DrawSync Socket Server started on {self.host}:{self.port}")
            
            # Start client handler thread
            client_thread = threading.Thread(target=self._handle_clients)
            client_thread.daemon = True
            client_thread.start()
            
            # Main server loop
            while self.running:
                try:
                    # Accept new connections
                    ready_to_read, _, _ = select.select([self.server_socket], [], [], 1.0)
                    if ready_to_read:
                        client_socket, address = self.server_socket.accept()
                        client_socket.setblocking(False)
                        
                        # Generate unique client ID
                        client_id = f"{address[0]}:{address[1]}:{int(time.time())}"
                        
                        with self.client_lock:
                            self.clients[client_id] = {
                                'socket': client_socket,
                                'address': address,
                                'user_id': None,
                                'room_id': None,
                                'username': None,
                                'buffer': b''
                            }
                        
                        print(f"🔌 New client connected: {client_id} from {address}")
                        
                except Exception as e:
                    if self.running:
                        print(f"❌ Server error: {e}")
                        
        except Exception as e:
            print(f"❌ Failed to start server: {e}")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the socket server"""
        self.running = False
        if self.server_socket:
            self.server_socket.close()
        
        # Close all client connections
        with self.client_lock:
            for client_id, client_info in list(self.clients.items()):
                try:
                    client_info['socket'].close()
                except:
                    pass
            self.clients.clear()
        
        print("🛑 Socket server stopped")
    
    def _handle_clients(self):
        """Handle client messages in a separate thread"""
        while self.running:
            try:
                with self.client_lock:
                    client_sockets = [info['socket'] for info in self.clients.values()]
                
                if not client_sockets:
                    time.sleep(0.1)
                    continue
                
                # Check for readable sockets
                ready_to_read, _, _ = select.select(client_sockets, [], [], 0.1)
                
                for client_socket in ready_to_read:
                    # Find client info
                    client_id = None
                    for cid, info in self.clients.items():
                        if info['socket'] == client_socket:
                            client_id = cid
                            break
                    
                    if not client_id:
                        continue
                    
                    # Handle client message
                    self._handle_client_message(client_id)
                    
            except Exception as e:
                if self.running:
                    print(f"❌ Client handler error: {e}")
    
    def _handle_client_message(self, client_id: str):
        """Handle a single client message"""
        try:
            client_info = self.clients[client_id]
            client_socket = client_info['socket']
            
            # Receive data
            data = client_socket.recv(4096)
            if not data:
                # Client disconnected
                self._disconnect_client(client_id)
                return
            
            # Add to buffer
            client_info['buffer'] += data
            
            # Process complete messages
            while b'\n' in client_info['buffer']:
                message_data, client_info['buffer'] = client_info['buffer'].split(b'\n', 1)
                
                if message_data:
                    try:
                        message = json.loads(message_data.decode('utf-8'))
                        self._process_message(client_id, message)
                    except json.JSONDecodeError:
                        print(f"❌ Invalid JSON from client {client_id}")
                    except Exception as e:
                        print(f"❌ Error processing message from {client_id}: {e}")
                        
        except Exception as e:
            print(f"❌ Error handling client {client_id}: {e}")
            self._disconnect_client(client_id)
    
    def _process_message(self, client_id: str, message: dict):
        """Process a client message"""
        message_type = message.get('type')
        
        if message_type == 'authenticate':
            self._handle_authenticate(client_id, message)
        elif message_type == 'join_room':
            self._handle_join_room(client_id, message)
        elif message_type == 'leave_room':
            self._handle_leave_room(client_id, message)
        elif message_type == 'draw':
            self._handle_draw(client_id, message)
        elif message_type == 'chat_message':
            self._handle_chat_message(client_id, message)
        elif message_type == 'start_game':
            self._handle_start_game(client_id, message)
        elif message_type == 'guess_word':
            self._handle_guess_word(client_id, message)
        elif message_type == 'ready':
            self._handle_ready(client_id, message)
        elif message_type == 'skip_turn':
            self._handle_skip_turn(client_id, message)
        elif message_type == 'clear_canvas':
            self._handle_clear_canvas(client_id, message)
        else:
            print(f"❌ Unknown message type: {message_type}")
    
    def _send_message(self, client_id: str, message: dict):
        """Send a message to a specific client"""
        try:
            client_info = self.clients.get(client_id)
            if client_info:
                data = json.dumps(message) + '\n'
                client_info['socket'].send(data.encode('utf-8'))
        except Exception as e:
            print(f"❌ Error sending message to {client_id}: {e}")
            self._disconnect_client(client_id)
    
    def _broadcast_to_room(self, room_id: int, message: dict, skip_client_id: str = None):
        """Broadcast a message to all clients in a room"""
        if room_id not in self.rooms:
            return
        
        # Create a copy of the set to avoid "Set changed size during iteration" error
        client_ids = list(self.rooms[room_id])
        for client_id in client_ids:
            if client_id != skip_client_id:
                self._send_message(client_id, message)
    
    def _handle_authenticate(self, client_id: str, message: dict):
        """Handle client authentication"""
        token = message.get('token')
        if not token:
            self._send_message(client_id, {
                'type': 'error',
                'message': 'Authentication token required'
            })
            return
        
        # Verify token and get user info
        username = verify_token(token)
        if not username:
            self._send_message(client_id, {
                'type': 'error',
                'message': 'Invalid authentication token'
            })
            return
        
        # Get user from database
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                self._send_message(client_id, {
                    'type': 'error',
                    'message': 'User not found'
                })
                return
            
            # Update client info
            with self.client_lock:
                if client_id in self.clients:
                    self.clients[client_id]['user_id'] = user.id
                    self.clients[client_id]['username'] = user.username
            
            # Send authentication success
            self._send_message(client_id, {
                'type': 'authenticated',
                'user_id': user.id,
                'username': user.username
            })
            
        finally:
            db.close()
    
    def _handle_join_room(self, client_id: str, message: dict):
        """Handle client joining a room"""
        room_id = message.get('room_id')
        if not room_id:
            self._send_message(client_id, {
                'type': 'error',
                'message': 'Room ID required'
            })
            return
        
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('user_id'):
            self._send_message(client_id, {
                'type': 'error',
                'message': 'Authentication required'
            })
            return
        
        # Add client to room
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(client_id)
        client_info['room_id'] = room_id
        
        # Add player to database session
        db = SessionLocal()
        try:
            import uuid
            
            # Check if player already has a session
            existing_session = db.query(GameSession).filter(
                GameSession.user_id == client_info['user_id'],
                GameSession.room_id == room_id,
                GameSession.left_at.is_(None)
            ).first()
            
            if not existing_session:
                # Create new session
                session = GameSession(
                    user_id=client_info['user_id'],
                    room_id=room_id,
                    session_token=str(uuid.uuid4()),
                    is_ready=False
                )
                db.add(session)
                db.commit()
                print(f"Created game session for user {client_info['user_id']} in room {room_id}")
            
        except Exception as e:
            print(f"Error creating game session: {e}")
            db.rollback()
        finally:
            db.close()
        
        # Notify other clients in the room
        self._broadcast_to_room(room_id, {
            'type': 'player_joined',
            'user_id': client_info['user_id'],
            'username': client_info['username']
        }, skip_client_id=client_id)
        
        # Send room info to client
        self._send_message(client_id, {
            'type': 'room_joined',
            'room_id': room_id,
            'players': self._get_room_players(room_id)
        })
        
        # Send current game state to the new player
        game_state = game_service.get_game_state(room_id)
        if game_state:
            self._send_message(client_id, {
                'type': 'game_state',
                **game_state
            })
            
            # Send all existing drawing data to the new player
            if game_state.get('drawing_data'):
                for drawing_point in game_state['drawing_data']:
                    self._send_message(client_id, {
                        'type': 'draw_data',
                        'data': drawing_point
                    })
    
    def _handle_leave_room(self, client_id: str, message: dict):
        """Handle client leaving a room"""
        client_info = self.clients.get(client_id)
        if not client_info:
            return
        
        room_id = client_info.get('room_id')
        if room_id and room_id in self.rooms:
            self.rooms[room_id].discard(client_id)
            
            # Update database session
            db = SessionLocal()
            try:
                from sqlalchemy.sql import func
                
                # Mark session as left
                session = db.query(GameSession).filter(
                    GameSession.user_id == client_info['user_id'],
                    GameSession.room_id == room_id,
                    GameSession.left_at.is_(None)
                ).first()
                
                if session:
                    session.left_at = func.now()
                    db.commit()
                    print(f"Marked session as left for user {client_info['user_id']} in room {room_id}")
            
            except Exception as e:
                print(f"Error updating game session: {e}")
                db.rollback()
            finally:
                db.close()
            
            # Notify other clients
            self._broadcast_to_room(room_id, {
                'type': 'player_left',
                'user_id': client_info['user_id'],
                'username': client_info['username']
            }, skip_client_id=client_id)
            
            client_info['room_id'] = None
    
    def _handle_draw(self, client_id: str, message: dict):
        """Handle drawing data"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        drawing_data = {
            'user_id': client_info['user_id'],
            'username': client_info['username'],
            'x': message.get('x'),
            'y': message.get('y'),
            'is_drawing': message.get('is_drawing'),
            'is_first_point': message.get('is_first_point', False),
            'color': message.get('color', '#000000'),
            'brush_size': message.get('brush_size', 2),
            'timestamp': message.get('timestamp', time.time() * 1000)  # Convert to milliseconds
        }
        
        # Add to game service
        game_service.add_drawing_data(room_id, drawing_data)
        
        # Broadcast to other players in the room
        self._broadcast_to_room(room_id, {
            'type': 'draw_data',
            'data': drawing_data
        }, skip_client_id=client_id)
    
    def _handle_chat_message(self, client_id: str, message: dict):
        """Handle chat message"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        chat_message = {
            'user_id': client_info['user_id'],
            'username': client_info['username'],
            'message': message.get('message', ''),
            'timestamp': time.time()
        }
        
        # Broadcast to all players in the room
        self._broadcast_to_room(room_id, {
            'type': 'chat_message',
            **chat_message
        })
    
    def _handle_start_game(self, client_id: str, message: dict):
        """Handle game start request"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            self._send_message(client_id, {
                'type': 'error',
                'message': 'Not in a room'
            })
            return
        
        room_id = client_info['room_id']
        db = SessionLocal()
        try:
            # Start the game in the service (synchronous version)
            game_state = self._start_game_sync(db, room_id)
            
            # Broadcast game started event
            self._broadcast_to_room(room_id, {
                'type': 'game_started',
                'room_id': room_id,
                'game_state': game_state
            })
            
            # Broadcast game state to all players
            self._broadcast_game_state(room_id, game_state)
        except Exception as e:
            self._send_message(client_id, {
                'type': 'error',
                'message': str(e)
            })
        finally:
            db.close()
    
    def _handle_guess_word(self, client_id: str, message: dict):
        """Handle word guess"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        guess = message.get('guess', '')
        
        # Submit guess to game service
        result = game_service.submit_guess(room_id, client_info['user_id'], guess)
        
        # Send result to the guesser
        self._send_message(client_id, {
            'type': 'guess_result',
            'correct': result['correct'],
            'message': result['message']
        })
        
        if result['correct']:
            # Award points to guesser and drawer
            game_state = game_service.active_games.get(room_id)
            if game_state:
                drawer_index = game_state.get("current_drawer_index", 0)
                if drawer_index < len(game_state.get("players", [])):
                    drawer_id = game_state["players"][drawer_index]["id"]
                    # Award points (e.g., 100 to guesser, 50 to drawer)
                    for p in game_state["players"]:
                        if p["id"] == client_info['user_id']:
                            p["score"] += 100
                        if p["id"] == drawer_id:
                            p["score"] += 50
            
            # Notify all players
            self._broadcast_to_room(room_id, {
                'type': 'correct_guess',
                'user_id': client_info['user_id'],
                'username': client_info['username'],
                'word': guess,
                'scores': {p['id']: p['score'] for p in game_state.get("players", [])} if game_state else {}
            })
            
            # End round and start next (synchronous wrapper)
            self._end_round_sync(room_id)
            
            # Fetch updated state
            updated_game_state = game_service.get_game_state(room_id)
            if updated_game_state:
                self._broadcast_game_state(room_id, updated_game_state)
            else:
                # Game ended, broadcast final scores
                # Get final scores from the game state before it was deleted
                final_scores = {}
                if game_state:
                    final_scores = {p['id']: p['score'] for p in game_state.get("players", [])}
                
                self._broadcast_to_room(room_id, {
                    'type': 'game_ended',
                    'room_id': room_id,
                    'final_scores': final_scores
                })
    
    def _handle_ready(self, client_id: str, message: dict):
        """Handle player ready status"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        is_ready = message.get('ready', False)
        
        # Update database session
        db = SessionLocal()
        try:
            session = db.query(GameSession).filter(
                GameSession.user_id == client_info['user_id'],
                GameSession.room_id == room_id,
                GameSession.left_at.is_(None)
            ).first()
            
            if session:
                session.is_ready = is_ready
                db.commit()
                print(f"Updated ready status for user {client_info['user_id']} in room {room_id}: {is_ready}")
        
        except Exception as e:
            print(f"Error updating ready status: {e}")
            db.rollback()
        finally:
            db.close()
        
        # Broadcast ready status to room
        self._broadcast_to_room(room_id, {
            'type': 'player_ready',
            'user_id': client_info['user_id'],
            'username': client_info['username'],
            'ready': is_ready
        })
    
    def _broadcast_game_state(self, room_id: int, game_state: dict):
        """Broadcast current game state to all players in the room"""
        if not game_state:
            return
            
        # Send word only to the drawer, blanks to others
        drawer_id = game_state.get("current_drawer_id")
        word = game_state.get("current_word", "")
        
        # Create a copy of the clients dict to avoid modification during iteration
        clients_copy = dict(self.clients)
        for client_id, info in clients_copy.items():
            if info.get('room_id') == room_id:
                if info.get('user_id') == drawer_id:
                    self._send_message(client_id, {
                        'type': 'game_state',
                        'current_drawer_id': drawer_id,
                        'word': word,
                        'current_round': game_state.get('current_round', 1),
                        'max_rounds': game_state.get('max_rounds', 5),
                        'scores': {p['id']: p['score'] for p in game_state.get('players', [])},
                        'time_remaining': game_state.get('time_remaining', 60),
                        'game_started': game_state.get('game_started', False),
                    })
                else:
                    self._send_message(client_id, {
                        'type': 'game_state',
                        'current_drawer_id': drawer_id,
                        'word': '_' * len(word) if word else '',
                        'current_round': game_state.get('current_round', 1),
                        'max_rounds': game_state.get('max_rounds', 5),
                        'scores': {p['id']: p['score'] for p in game_state.get('players', [])},
                        'time_remaining': game_state.get('time_remaining', 60),
                        'game_started': game_state.get('game_started', False),
                    })
    
    def _get_room_players(self, room_id: int) -> List[Dict]:
        """Get list of players in a room with complete information"""
        if room_id not in self.rooms:
            return []
        
        players = []
        # Create a copy of the set to avoid "Set changed size during iteration" error
        client_ids = list(self.rooms[room_id])
        
        # Get database session to fetch player details
        db = SessionLocal()
        try:
            for client_id in client_ids:
                client_info = self.clients.get(client_id)
                if client_info and client_info.get('user_id'):
                    # Get session information from database
                    session = db.query(GameSession).filter(
                        GameSession.user_id == client_info['user_id'],
                        GameSession.room_id == room_id,
                        GameSession.left_at.is_(None)
                    ).first()
                    
                    if session:
                        players.append({
                            'id': session.id,
                            'user_id': client_info['user_id'],
                            'username': client_info['username'],
                            'is_ready': session.is_ready,
                            'score': session.score,
                            'joined_at': session.joined_at
                        })
        finally:
            db.close()
        
        return players
    
    def _start_game_sync(self, db, room_id):
        """Synchronous wrapper for starting a game"""
        import asyncio
        
        # Create a new event loop for this thread if needed
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Run the async method in the event loop
        return loop.run_until_complete(game_service.start_game(db, room_id))
    
    def _end_round_sync(self, room_id):
        """Synchronous wrapper for ending a round"""
        import asyncio
        
        # Create a new event loop for this thread if needed
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Run the async method in the event loop
        return loop.run_until_complete(game_service.end_round(room_id))
    
    def _disconnect_client(self, client_id: str):
        """Disconnect and clean up client"""
        client_info = self.clients.get(client_id)
        if not client_info:
            return
        
        # Remove from room
        room_id = client_info.get('room_id')
        if room_id and room_id in self.rooms:
            self.rooms[room_id].discard(client_id)
            
            # Notify other players
            self._broadcast_to_room(room_id, {
                'type': 'player_disconnected',
                'user_id': client_info['user_id'],
                'username': client_info['username']
            })
        
        # Close socket
        try:
            client_info['socket'].close()
        except:
            pass
        
        # Remove from clients
        with self.client_lock:
            if client_id in self.clients:
                del self.clients[client_id]
        
        print(f"Client {client_id} disconnected")

    def _handle_skip_turn(self, client_id: str, message: dict):
        """Handle skip turn request"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        game_state = game_service.active_games.get(room_id)
        
        if not game_state:
            return
        
        # Check if the client is the current drawer
        current_drawer_id = game_state.get("players", [])[game_state.get("current_drawer_index", 0)]["id"]
        if client_info['user_id'] != current_drawer_id:
            return
        
        # End the current round
        self._end_round_sync(room_id)
        
        # Fetch updated state
        updated_game_state = game_service.get_game_state(room_id)
        if updated_game_state:
            self._broadcast_game_state(room_id, updated_game_state)
    
    def _handle_clear_canvas(self, client_id: str, message: dict):
        """Handle clear canvas request"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        game_state = game_service.active_games.get(room_id)
        
        if not game_state:
            return
        
        # Check if the client is the current drawer
        current_drawer_id = game_state.get("players", [])[game_state.get("current_drawer_index", 0)]["id"]
        if client_info['user_id'] != current_drawer_id:
            return
        
        # Clear drawing data
        game_state["drawing_data"] = []
        
        # Broadcast clear canvas to all players
        self._broadcast_to_room(room_id, {
            'type': 'canvas_cleared'
        })

# Global socket server instance
socket_server = DrawSyncSocketServer()

def start_socket_server():
    """Start the socket server"""
    socket_server.start()

if __name__ == "__main__":
    start_socket_server() 