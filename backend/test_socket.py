#!/usr/bin/env python3
"""
Simple socket client test script to verify socket server functionality
"""

import socket
import json
import time
import threading

class DrawSyncSocketClient:
    """Simple socket client for testing"""
    
    def __init__(self, host='localhost', port=8001):
        self.host = host
        self.port = port
        self.socket = None
        self.connected = False
        self.authenticated = False
        
    def connect(self):
        """Connect to the socket server"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            self.connected = True
            print(f"✅ Connected to socket server at {self.host}:{self.port}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            return False
    
    def send_message(self, message):
        """Send a message to the server"""
        if not self.connected:
            print("❌ Not connected to server")
            return False
        
        try:
            data = json.dumps(message).encode('utf-8')
            self.socket.send(data)
            return True
        except Exception as e:
            print(f"❌ Failed to send message: {e}")
            return False
    
    def receive_message(self):
        """Receive a message from the server"""
        if not self.connected:
            return None
        
        try:
            data = self.socket.recv(4096)
            if data:
                message = json.loads(data.decode('utf-8'))
                return message
            return None
        except Exception as e:
            print(f"❌ Failed to receive message: {e}")
            return None
    
    def authenticate(self, token):
        """Authenticate with the server"""
        message = {
            'type': 'authenticate',
            'token': token
        }
        
        if self.send_message(message):
            response = self.receive_message()
            if response and response.get('type') == 'authenticated':
                self.authenticated = True
                print("✅ Authentication successful")
                return True
            else:
                print("❌ Authentication failed")
                return False
        return False
    
    def join_room(self, room_id):
        """Join a game room"""
        if not self.authenticated:
            print("❌ Must authenticate first")
            return False
        
        message = {
            'type': 'join_room',
            'room_id': room_id
        }
        
        if self.send_message(message):
            response = self.receive_message()
            if response and response.get('type') == 'room_joined':
                print(f"✅ Joined room {room_id}")
                return True
            else:
                print("❌ Failed to join room")
                return False
        return False
    
    def send_chat_message(self, message_text):
        """Send a chat message"""
        if not self.authenticated:
            print("❌ Must authenticate first")
            return False
        
        message = {
            'type': 'chat_message',
            'message': message_text
        }
        
        return self.send_message(message)
    
    def send_drawing_data(self, x, y, is_drawing=True, color="#000000", brush_size=2):
        """Send drawing data"""
        if not self.authenticated:
            print("❌ Must authenticate first")
            return False
        
        message = {
            'type': 'draw',
            'x': x,
            'y': y,
            'is_drawing': is_drawing,
            'color': color,
            'brush_size': brush_size
        }
        
        return self.send_message(message)
    
    def guess_word(self, guess):
        """Submit a word guess"""
        if not self.authenticated:
            print("❌ Must authenticate first")
            return False
        
        message = {
            'type': 'guess_word',
            'guess': guess
        }
        
        if self.send_message(message):
            response = self.receive_message()
            if response and response.get('type') == 'guess_result':
                correct = response.get('correct', False)
                message_text = response.get('message', '')
                if correct:
                    print(f"✅ Correct guess: {message_text}")
                else:
                    print(f"❌ Incorrect guess: {message_text}")
                return correct
        return False
    
    def close(self):
        """Close the connection"""
        if self.socket:
            self.socket.close()
        self.connected = False
        self.authenticated = False
        print("🔌 Connection closed")

def test_socket_connection():
    """Test basic socket connection"""
    print("Testing socket connection...")
    client = DrawSyncSocketClient()
    
    if not client.connect():
        print("❌ Socket server is not running. Please start it first.")
        return None
    
    return client

def test_authentication(client, token):
    """Test authentication"""
    print("\nTesting authentication...")
    if client.authenticate(token):
        return True
    else:
        print("❌ Authentication failed. Make sure you have a valid token.")
        return False

def test_room_operations(client):
    """Test room operations"""
    print("\nTesting room operations...")
    
    # Try to join room 1
    if client.join_room(1):
        print("✅ Room join successful")
        
        # Send a chat message
        print("\nSending chat message...")
        if client.send_chat_message("Hello, everyone!"):
            print("✅ Chat message sent")
        
        # Send some drawing data
        print("\nSending drawing data...")
        if client.send_drawing_data(100, 100, True, "#FF0000", 3):
            print("✅ Drawing data sent")
        
        # Try to guess a word
        print("\nTesting word guess...")
        client.guess_word("test")
        
        return True
    else:
        print("❌ Room operations failed")
        return False

def main():
    """Run socket tests"""
    print("🔌 Starting DrawSync Socket Tests")
    print("=" * 50)
    
    # Test connection
    client = test_socket_connection()
    if not client:
        return
    
    # Note: You'll need to get a valid token from the API first
    print("\n⚠️  Note: You need to get a valid JWT token from the API first.")
    print("1. Start the FastAPI server: uvicorn app.main:app --reload")
    print("2. Register/login a user to get a token")
    print("3. Use that token in the authentication test")
    
    token = input("\nEnter your JWT token (or press Enter to skip auth tests): ").strip()
    
    if token:
        # Test authentication
        if test_authentication(client, token):
            # Test room operations
            test_room_operations(client)
    else:
        print("Skipping authentication tests...")
    
    # Keep connection alive for a bit to receive any messages
    print("\nWaiting for messages (5 seconds)...")
    start_time = time.time()
    while time.time() - start_time < 5:
        message = client.receive_message()
        if message:
            print(f"📨 Received: {message}")
        time.sleep(0.1)
    
    # Close connection
    client.close()
    
    print("\n" + "=" * 50)
    print("🎉 Socket tests completed!")

if __name__ == "__main__":
    main() 