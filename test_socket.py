#!/usr/bin/env python3
"""
Simple test script to verify socket server functionality
"""

import socket
import threading
import json
import time
import random

class TestClient:
    def __init__(self, name, host='localhost', port=8001):
        self.name = name
        self.host = host
        self.port = port
        self.socket = None
        self.authenticated = False
        self.room_id = None
        self.user_id = None
        self.username = name
        self.running = False
        
    def connect(self):
        """Connect to the server"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            self.running = True
            
            # Start receiver thread
            receiver_thread = threading.Thread(target=self._receive_messages)
            receiver_thread.daemon = True
            receiver_thread.start()
            
            print(f"✅ {self.name}: Connected to server")
            return True
        except Exception as e:
            print(f"❌ {self.name}: Connection failed: {e}")
            return False
    
    def authenticate(self):
        """Authenticate with the server"""
        # Simulate authentication with a fake token
        message = {
            'type': 'authenticate',
            'token': f'fake_token_{self.name}'
        }
        
        if self.send_message(message):
            print(f"🔐 {self.name}: Authentication sent")
            return True
        return False
    
    def join_room(self, room_id):
        """Join a game room"""
        if not self.authenticated:
            return False
            
        message = {
            'type': 'join_room',
            'room_id': room_id
        }
        
        if self.send_message(message):
            print(f"🚪 {self.name}: Joining room {room_id}")
            return True
        return False
    
    def send_drawing_data(self, x, y, is_drawing=True, color="#000000", brush_size=2):
        """Send drawing data"""
        if not self.authenticated or not self.room_id:
            return False
            
        message = {
            'type': 'draw',
            'x': x,
            'y': y,
            'is_drawing': is_drawing,
            'color': color,
            'brush_size': brush_size,
            'timestamp': int(time.time() * 1000)
        }
        
        return self.send_message(message)
    
    def send_chat_message(self, message_text):
        """Send a chat message"""
        if not self.authenticated or not self.room_id:
            return False
            
        message = {
            'type': 'chat_message',
            'message': message_text
        }
        
        return self.send_message(message)
    
    def start_game(self):
        """Start the game"""
        if not self.authenticated or not self.room_id:
            return False
            
        message = {
            'type': 'start_game'
        }
        
        return self.send_message(message)
    
    def send_message(self, message):
        """Send a message to the server"""
        try:
            data = json.dumps(message) + '\n'
            self.socket.send(data.encode('utf-8'))
            return True
        except Exception as e:
            print(f"❌ {self.name}: Error sending message: {e}")
            return False
    
    def _receive_messages(self):
        """Receive messages from the server"""
        buffer = b''
        
        while self.running:
            try:
                data = self.socket.recv(4096)
                if not data:
                    break
                
                buffer += data
                
                # Process complete messages
                while b'\n' in buffer:
                    message_data, buffer = buffer.split(b'\n', 1)
                    
                    if message_data:
                        try:
                            message = json.loads(message_data.decode('utf-8'))
                            self._handle_message(message)
                        except json.JSONDecodeError:
                            print(f"❌ {self.name}: Invalid JSON received")
                        except Exception as e:
                            print(f"❌ {self.name}: Error handling message: {e}")
                            
            except Exception as e:
                if self.running:
                    print(f"❌ {self.name}: Error receiving data: {e}")
                break
        
        print(f"🔌 {self.name}: Disconnected from server")
    
    def _handle_message(self, message):
        """Handle received messages"""
        message_type = message.get('type')
        
        if message_type == 'authenticated':
            self.authenticated = True
            self.user_id = message.get('user_id')
            print(f"✅ {self.name}: Authenticated successfully")
            
        elif message_type == 'room_joined':
            self.room_id = message.get('room_id')
            players = message.get('players', [])
            print(f"🚪 {self.name}: Joined room {self.room_id} with {len(players)} players")
            
        elif message_type == 'player_joined':
            username = message.get('username')
            print(f"👤 {self.name}: {username} joined the room")
            
        elif message_type == 'player_left':
            username = message.get('username')
            print(f"👤 {self.name}: {username} left the room")
            
        elif message_type == 'game_started':
            print(f"🎮 {self.name}: Game started!")
            
        elif message_type == 'round_started':
            round_num = message.get('round')
            drawer = message.get('drawer')
            print(f"🔄 {self.name}: Round {round_num} started, {drawer} is drawing")
            
        elif message_type == 'word_assigned':
            word = message.get('word')
            msg = message.get('message', '')
            print(f"📝 {self.name}: {msg}")
            
        elif message_type == 'draw_data':
            data = message.get('data', {})
            username = data.get('username', 'Unknown')
            print(f"🎨 {self.name}: Drawing from {username}")
            
        elif message_type == 'chat_message':
            username = message.get('username', 'Unknown')
            msg = message.get('message', '')
            print(f"💬 {self.name}: {username}: {msg}")
            
        elif message_type == 'correct_guess':
            username = message.get('username', 'Unknown')
            word = message.get('word', '')
            print(f"🎉 {self.name}: {username} guessed '{word}' correctly!")
            
        elif message_type == 'round_ended':
            round_num = message.get('round')
            word = message.get('word', '')
            print(f"⏹️ {self.name}: Round {round_num} ended. Word was: {word}")
            
        elif message_type == 'game_ended':
            final_scores = message.get('final_scores', {})
            print(f"🏁 {self.name}: Game ended! Final scores: {final_scores}")
            
        elif message_type == 'time_update':
            time_remaining = message.get('time_remaining')
            print(f"⏰ {self.name}: Time remaining: {time_remaining}s")
            
        elif message_type == 'error':
            error_msg = message.get('message', 'Unknown error')
            print(f"❌ {self.name}: Server error: {error_msg}")
            
        else:
            print(f"❓ {self.name}: Unknown message type: {message_type}")
    
    def disconnect(self):
        """Disconnect from the server"""
        self.running = False
        if self.socket:
            self.socket.close()
        print(f"🔌 {self.name}: Disconnected")

def test_basic_functionality():
    """Test basic socket server functionality"""
    print("🧪 Starting basic functionality test...")
    
    # Create test clients
    client1 = TestClient("Alice")
    client2 = TestClient("Bob")
    client3 = TestClient("Charlie")
    
    # Connect clients
    if not client1.connect() or not client2.connect() or not client3.connect():
        print("❌ Failed to connect clients")
        return
    
    # Authenticate clients
    client1.authenticate()
    client2.authenticate()
    client3.authenticate()
    
    time.sleep(1)  # Wait for authentication
    
    # Join room
    room_id = 1
    client1.join_room(room_id)
    client2.join_room(room_id)
    client3.join_room(room_id)
    
    time.sleep(2)  # Wait for room joining
    
    # Start game
    client1.start_game()
    
    time.sleep(5)  # Wait for game to start
    
    # Simulate drawing
    for i in range(10):
        x = random.randint(100, 300)
        y = random.randint(100, 300)
        client1.send_drawing_data(x, y, True)
        time.sleep(0.1)
    
    # Simulate chat messages and guesses
    client2.send_chat_message("Hello everyone!")
    client3.send_chat_message("Good luck!")
    
    # Simulate word guess (this would need to match the actual word)
    client2.send_chat_message("elephant")  # Example word
    
    time.sleep(10)  # Wait for game to progress
    
    # Disconnect clients
    client1.disconnect()
    client2.disconnect()
    client3.disconnect()
    
    print("✅ Basic functionality test completed")

def test_player_management():
    """Test player management and room deletion"""
    print("🧪 Starting player management test...")
    
    # Create clients
    client1 = TestClient("Player1")
    client2 = TestClient("Player2")
    
    # Connect and authenticate
    client1.connect()
    client2.connect()
    client1.authenticate()
    client2.authenticate()
    
    time.sleep(1)
    
    # Join same room
    room_id = 2
    client1.join_room(room_id)
    client2.join_room(room_id)
    
    time.sleep(2)
    
    # Disconnect one client
    client1.disconnect()
    
    time.sleep(2)
    
    # Disconnect second client (should trigger room deletion)
    client2.disconnect()
    
    print("✅ Player management test completed")

if __name__ == "__main__":
    print("🚀 Starting DrawSync Socket Server Tests")
    print("=" * 50)
    
    # Run tests
    test_basic_functionality()
    print()
    test_player_management()
    
    print("\n🎉 All tests completed!") 