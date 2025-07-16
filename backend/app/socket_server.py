import socket
import threading
import json
import time
import select
from typing import Dict, List, Set, Optional
from .config import settings
from .database import SessionLocal
from .models.user import User
from .models.game_session import GameSession
from .core.security import verify_token
from .core.words import word_manager

class DrawSyncSocketServer:
    """Raw Python socket server for DrawSync game - Fixed version"""
    
    def __init__(self, host='localhost', port=8001):
        self.host = host
        self.port = port
        self.server_socket = None
        self.clients: Dict[str, Dict] = {}  # client_id -> client_info
        self.rooms: Dict[int, Dict] = {}  # room_id -> room_info
        self.running = False
        self.client_lock = threading.Lock()
        
        # Game state management
        self.active_games = {}  # room_id -> game_state
        self.game_timers = {}   # room_id -> timer_thread
        
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
        
        # Stop all game timers
        for timer in self.game_timers.values():
            if timer and timer.is_alive():
                timer.cancel()
        
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
        elif message_type == 'delete_room':
            self._handle_delete_room(client_id, message)
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
        
        room_info = self.rooms[room_id]
        for client_id in room_info['clients']:
            if client_id != skip_client_id:
                self._send_message(client_id, message)
    
    def _handle_authenticate(self, client_id: str, message: dict):
        """Handle client authentication"""
        token = message.get('token')
        if not token:
            self._send_message(client_id, {
                'type': 'error',
                'message': 'Token required'
            })
            return
        
        try:
            # Verify token
            username = verify_token(token)
            
            if not username:
                self._send_message(client_id, {
                    'type': 'error',
                    'message': 'Invalid token'
                })
                return
            
            # Get user info from database
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
                
                print(f"✅ Client {client_id} authenticated as {user.username}")
                
            finally:
                db.close()
                
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            self._send_message(client_id, {
                'type': 'error',
                'message': 'Authentication failed'
            })
    
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
        
        # Check if user is already in a room
        current_room = client_info.get('room_id')
        if current_room and current_room in self.rooms:
            # Remove from current room first
            self.rooms[current_room]['clients'].discard(client_id)
            if not self.rooms[current_room]['clients']:
                del self.rooms[current_room]
        
        # Add client to new room
        if room_id not in self.rooms:
            self.rooms[room_id] = {
                'clients': set(),
                'players': {},
                'game_state': None,
                'drawing_data': [],
                'current_round': 0,
                'max_rounds': 4,
                'current_drawer_index': 0,
                'current_word': '',
                'time_remaining': 60,
                'game_started': False,
                'guessed_players': set(),
                'round_start_time': None
            }
        
        self.rooms[room_id]['clients'].add(client_id)
        client_info['room_id'] = room_id
        
        # Add player to room players
        self.rooms[room_id]['players'][client_info['user_id']] = {
            'id': client_info['user_id'],
            'username': client_info['username'],
            'score': 0,
            'ready': False
        }
        
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
            'players': list(self.rooms[room_id]['players'].values())
        })
        
        # Send current game state to the new player
        room_info = self.rooms[room_id]
        if room_info['game_started']:
            self._send_game_state_to_client(client_id, room_id)
            
            # Send all existing drawing data to the new player
            for drawing_point in room_info['drawing_data']:
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
            room_info = self.rooms[room_id]
            room_info['clients'].discard(client_id)
            
            # Remove player from room players
            if client_info['user_id'] in room_info['players']:
                del room_info['players'][client_info['user_id']]
            
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
            
            # If room is empty, delete it
            if not room_info['clients']:
                del self.rooms[room_id]
                print(f"Room {room_id} deleted (no players left)")
            
            client_info['room_id'] = None
    
    def _handle_delete_room(self, client_id: str, message: dict):
        """Handle room deletion request"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        if room_id in self.rooms:
            # Stop game timer if running
            if room_id in self.game_timers:
                self.game_timers[room_id].cancel()
                del self.game_timers[room_id]
            
            # Notify all clients in room
            self._broadcast_to_room(room_id, {
                'type': 'room_deleted',
                'message': 'Room has been deleted'
            })
            
            # Close all client connections in the room
            room_clients = list(self.rooms[room_id]['clients'])
            for client_id in room_clients:
                self._disconnect_client(client_id)
            
            # Delete room
            del self.rooms[room_id]
            print(f"Room {room_id} deleted by {client_info['username']}")
    
    def _handle_draw(self, client_id: str, message: dict):
        """Handle drawing data"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        room_info = self.rooms[room_id]
        
        # Check if it's the client's turn to draw
        if not room_info['game_started']:
            return
        
        players_list = list(room_info['players'].values())
        if room_info['current_drawer_index'] >= len(players_list):
            return
        
        current_drawer = players_list[room_info['current_drawer_index']]
        if current_drawer['id'] != client_info['user_id']:
            return
        
        drawing_data = {
            'user_id': client_info['user_id'],
            'username': client_info['username'],
            'x': message.get('x'),
            'y': message.get('y'),
            'is_drawing': message.get('is_drawing'),
            'is_first_point': message.get('is_first_point', False),
            'color': message.get('color', '#000000'),
            'brush_size': message.get('brush_size', 2),
            'timestamp': message.get('timestamp', time.time() * 1000)
        }
        
        # Add to room drawing data
        room_info['drawing_data'].append(drawing_data)
        
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
        
        # Always broadcast chat message to all players
        self._broadcast_to_room(room_id, {
            'type': 'chat_message',
            **chat_message
        })
        
        # Check if it's a word guess
        if room_id in self.rooms and self.rooms[room_id]['game_started']:
            self._check_word_guess(room_id, client_info['user_id'], chat_message['message'])
    
    def _check_word_guess(self, room_id: int, user_id: int, guess: str):
        """Check if a chat message is a correct word guess"""
        room_info = self.rooms[room_id]
        current_word = room_info['current_word']
        
        if not current_word:
            return
        
        # Check if player already guessed
        if user_id in room_info['guessed_players']:
            return
        
        # Check if guess is correct
        if guess.lower().strip() == current_word.lower():
            room_info['guessed_players'].add(user_id)
            
            # Award points
            if user_id in room_info['players']:
                room_info['players'][user_id]['score'] += 100
            
            # Award points to drawer
            players_list = list(room_info['players'].values())
            if room_info['current_drawer_index'] < len(players_list):
                drawer = players_list[room_info['current_drawer_index']]
                if drawer['id'] in room_info['players']:
                    room_info['players'][drawer['id']]['score'] += 50
            
            # Notify all players about correct guess
            self._broadcast_to_room(room_id, {
                'type': 'correct_guess',
                'user_id': user_id,
                'username': room_info['players'][user_id]['username'],
                'word': guess,
                'message': f"{room_info['players'][user_id]['username']} guessed the word correctly!"
            })
            
            # End round and start next
            self._end_round(room_id)
    
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
        room_info = self.rooms[room_id]
        
        # Check if enough players
        if len(room_info['players']) < 2:
            self._send_message(client_id, {
                'type': 'error',
                'message': 'Need at least 2 players to start'
            })
            return
        
        # Start the game
        room_info['game_started'] = True
        room_info['current_round'] = 1
        room_info['current_drawer_index'] = 0
        room_info['drawing_data'] = []
        room_info['guessed_players'] = set()
        
        # Broadcast game started
        self._broadcast_to_room(room_id, {
            'type': 'game_started',
            'room_id': room_id
        })
        
        # Start first round
        self._start_round(room_id)
    
    def _start_round(self, room_id: int):
        """Start a new round"""
        if room_id not in self.rooms:
            return
        
        room_info = self.rooms[room_id]
        players_list = list(room_info['players'].values())
        
        if room_info['current_drawer_index'] >= len(players_list):
            # All players have drawn, end game
            self._end_game(room_id)
            return
        
        # Get current drawer
        current_drawer = players_list[room_info['current_drawer_index']]
        
        # Assign word
        word = word_manager.get_random_word()
        room_info['current_word'] = word
        room_info['time_remaining'] = 60
        room_info['round_start_time'] = time.time()
        room_info['guessed_players'] = set()
        room_info['drawing_data'] = []
        
        # Broadcast round start
        self._broadcast_to_room(room_id, {
            'type': 'round_started',
            'round': room_info['current_round'],
            'drawer': current_drawer['username'],
            'time_remaining': room_info['time_remaining']
        })
        
        # Send word to drawer
        for client_id in room_info['clients']:
            client_info = self.clients[client_id]
            if client_info['user_id'] == current_drawer['id']:
                self._send_message(client_id, {
                    'type': 'word_assigned',
                    'word': word,
                    'message': f'Your turn to draw! Word: {word}'
                })
            else:
                self._send_message(client_id, {
                    'type': 'word_assigned',
                    'word': '_' * len(word),
                    'message': f'{current_drawer["username"]} is drawing!'
                })
        
        # Start timer
        self._start_round_timer(room_id)
    
    def _start_round_timer(self, room_id: int):
        """Start a timer for the current round"""
        # Cancel existing timer if any
        if room_id in self.game_timers:
            self.game_timers[room_id].cancel()
        
        def round_timer():
            start_time = time.time()
            duration = 60  # 60 seconds
            
            while time.time() - start_time < duration:
                if room_id not in self.rooms:
                    return
                
                room_info = self.rooms[room_id]
                remaining = max(0, duration - int(time.time() - start_time))
                room_info['time_remaining'] = remaining
                
                # Send time update every second
                self._broadcast_to_room(room_id, {
                    'type': 'time_update',
                    'time_remaining': remaining
                })
                
                time.sleep(1)
            
            # Time's up
            if room_id in self.rooms:
                self._end_round(room_id)
        
        timer_thread = threading.Thread(target=round_timer, daemon=True)
        timer_thread.start()
        self.game_timers[room_id] = timer_thread
    
    def _end_round(self, room_id: int):
        """End the current round"""
        if room_id not in self.rooms:
            return
        
        room_info = self.rooms[room_id]
        
        # Stop timer
        if room_id in self.game_timers:
            self.game_timers[room_id].cancel()
            del self.game_timers[room_id]
        
        # Broadcast round end
        self._broadcast_to_room(room_id, {
            'type': 'round_ended',
            'round': room_info['current_round'],
            'word': room_info['current_word']
        })
        
        # Move to next round
        room_info['current_round'] += 1
        room_info['current_drawer_index'] += 1
        
        # Check if game should end
        if room_info['current_round'] > room_info['max_rounds']:
            self._end_game(room_id)
        else:
            # Start next round after delay
            threading.Timer(3.0, lambda: self._start_round(room_id)).start()
    
    def _end_game(self, room_id: int):
        """End the game"""
        if room_id not in self.rooms:
            return
        
        room_info = self.rooms[room_id]
        
        # Stop timer
        if room_id in self.game_timers:
            self.game_timers[room_id].cancel()
            del self.game_timers[room_id]
        
        # Calculate final scores
        final_scores = {}
        for player in room_info['players'].values():
            final_scores[player['id']] = player['score']
        
        # Broadcast game end
        self._broadcast_to_room(room_id, {
            'type': 'game_ended',
            'final_scores': final_scores,
            'message': 'Game ended!'
        })
        
        # Reset game state
        room_info['game_started'] = False
        room_info['current_round'] = 0
        room_info['current_drawer_index'] = 0
        room_info['current_word'] = ''
        room_info['drawing_data'] = []
        room_info['guessed_players'] = set()
    
    def _handle_guess_word(self, client_id: str, message: dict):
        """Handle word guess (legacy support)"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        guess = message.get('guess', '')
        
        # Send as chat message for processing
        self._check_word_guess(room_id, client_info['user_id'], guess)
    
    def _handle_ready(self, client_id: str, message: dict):
        """Handle player ready status"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        room_info = self.rooms[room_id]
        is_ready = message.get('ready', False)
        
        # Update player ready status
        if client_info['user_id'] in room_info['players']:
            room_info['players'][client_info['user_id']]['ready'] = is_ready
        
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
    
    def _handle_skip_turn(self, client_id: str, message: dict):
        """Handle turn skip request"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        room_info = self.rooms[room_id]
        
        # Check if it's the client's turn
        players_list = list(room_info['players'].values())
        if room_info['current_drawer_index'] >= len(players_list):
            return
        
        current_drawer = players_list[room_info['current_drawer_index']]
        if current_drawer['id'] != client_info['user_id']:
            return
        
        # End current round
        self._end_round(room_id)
    
    def _handle_clear_canvas(self, client_id: str, message: dict):
        """Handle canvas clear request"""
        client_info = self.clients.get(client_id)
        if not client_info or not client_info.get('room_id'):
            return
        
        room_id = client_info['room_id']
        room_info = self.rooms[room_id]
        
        # Check if it's the client's turn
        players_list = list(room_info['players'].values())
        if room_info['current_drawer_index'] >= len(players_list):
            return
        
        current_drawer = players_list[room_info['current_drawer_index']]
        if current_drawer['id'] != client_info['user_id']:
            return
        
        # Clear drawing data
        room_info['drawing_data'] = []
        
        # Broadcast clear canvas
        self._broadcast_to_room(room_id, {
            'type': 'canvas_cleared',
            'user_id': client_info['user_id'],
            'username': client_info['username']
        })
    
    def _send_game_state_to_client(self, client_id: str, room_id: int):
        """Send current game state to a specific client"""
        if room_id not in self.rooms:
            return
        
        room_info = self.rooms[room_id]
        client_info = self.clients[client_id]
        
        # Determine if client is the current drawer
        players_list = list(room_info['players'].values())
        is_drawer = False
        if room_info['current_drawer_index'] < len(players_list):
            current_drawer = players_list[room_info['current_drawer_index']]
            is_drawer = current_drawer['id'] == client_info['user_id']
        
        # Send appropriate game state
        game_state = {
            'type': 'game_state',
            'current_round': room_info['current_round'],
            'max_rounds': room_info['max_rounds'],
            'time_remaining': room_info['time_remaining'],
            'game_started': room_info['game_started'],
            'players': list(room_info['players'].values()),
            'word': room_info['current_word'] if is_drawer else '_' * len(room_info['current_word']) if room_info['current_word'] else '',
            'is_drawer': is_drawer
        }
        
        self._send_message(client_id, game_state)
    
    def _get_room_players(self, room_id: int) -> List[Dict]:
        """Get list of players in a room"""
        if room_id not in self.rooms:
            return []
        
        return list(self.rooms[room_id]['players'].values())
    
    def _disconnect_client(self, client_id: str):
        """Disconnect a client"""
        client_info = self.clients.get(client_id)
        if not client_info:
            return
        
        # Remove from room
        room_id = client_info.get('room_id')
        if room_id and room_id in self.rooms:
            room_info = self.rooms[room_id]
            room_info['clients'].discard(client_id)
            
            # Remove player from room players
            if client_info['user_id'] in room_info['players']:
                del room_info['players'][client_info['user_id']]
            
            # Notify other clients
            self._broadcast_to_room(room_id, {
                'type': 'player_disconnected',
                'user_id': client_info['user_id'],
                'username': client_info['username']
            }, skip_client_id=client_id)
            
            # If room is empty, delete it
            if not room_info['clients']:
                del self.rooms[room_id]
                print(f"Room {room_id} deleted (no players left)")
        
        # Close socket
        try:
            client_info['socket'].close()
        except:
            pass
        
        # Remove from clients
        with self.client_lock:
            if client_id in self.clients:
                del self.clients[client_id]
        
        print(f"🔌 Client {client_id} disconnected")


def start_socket_server():
    """Start the socket server"""
    server = DrawSyncSocketServer()
    try:
        server.start()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down socket server...")
        server.stop()
    except Exception as e:
        print(f"❌ Socket server error: {e}")
        server.stop()


if __name__ == "__main__":
    start_socket_server() 