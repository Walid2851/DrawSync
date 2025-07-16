#!/usr/bin/env python3
"""
Test client for the raw Python socket server
"""

import socket
import json
import time
import threading

class RawSocketClient:
    """Test client for raw Python socket server"""
    
    def __init__(self, host='localhost', port=8001):
        self.host = host
        self.port = port
        self.socket = None
        self.connected = False
        self.authenticated = False
        self.buffer = b''
        
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
            data = (json.dumps(message) + '\n').encode('utf-8')
            self.socket.send(data)
            print(f"📤 Sent: {message.get('type', 'unknown')}")
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
                self.buffer += data
                
                # Process complete messages
                while b'\n' in self.buffer:
                    message_data, self.buffer = self.buffer.split(b'\n', 1)
                    
                    if message_data:
                        message = json.loads(message_data.decode('utf-8'))
                        print(f"📥 Received: {message.get('type', 'unknown')} - {message}")
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
    
    def close(self):
        """Close the connection"""
        if self.socket:
            self.socket.close()
        self.connected = False
        self.authenticated = False
        print("🔌 Connection closed")

def test_socket_connection():
    """Test basic socket connection"""
    print("Testing raw socket connection...")
    client = RawSocketClient()
    
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
        if client.send_chat_message("Hello from raw socket test!"):
            print("✅ Chat message sent")
        
        # Send some drawing data
        print("\nSending drawing data...")
        if client.send_drawing_data(100, 100, True, "#FF0000", 3):
            print("✅ Drawing data sent")
        
        # Listen for a few messages
        print("\nListening for messages...")
        for i in range(5):
            client.receive_message()
            time.sleep(1)
    
    return True

def main():
    """Main test function"""
    print("🧪 Testing Raw Python Socket Implementation")
    print("=" * 50)
    
    # Test connection
    client = test_socket_connection()
    if not client:
        return
    
    # Test authentication (you'll need a valid token)
    # token = "your_jwt_token_here"
    # if not test_authentication(client, token):
    #     client.close()
    #     return
    
    # Test room operations
    test_room_operations(client)
    
    # Cleanup
    client.close()
    print("\n✅ Raw socket test completed!")

if __name__ == "__main__":
    main() 