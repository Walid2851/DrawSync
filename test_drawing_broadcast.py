#!/usr/bin/env python3
"""
Test script to verify drawing data broadcasting
"""

import socket
import json
import time
import threading

class DrawingTestClient:
    def __init__(self, name, host='localhost', port=8001):
        self.name = name
        self.host = host
        self.port = port
        self.socket = None
        self.connected = False
        self.authenticated = False
        self.room_id = None
        self.received_draw_data = []
        
    def connect(self):
        """Connect to the socket server"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            self.connected = True
            print(f"✅ {self.name}: Connected to server")
            return True
        except Exception as e:
            print(f"❌ {self.name}: Failed to connect: {e}")
            return False
    
    def authenticate(self, token="test_token"):
        """Authenticate with the server"""
        if not self.connected:
            return False
            
        message = {
            'type': 'authenticate',
            'token': token
        }
        
        if self.send_message(message):
            response = self.receive_message()
            if response and response.get('type') == 'authenticated':
                self.authenticated = True
                print(f"✅ {self.name}: Authenticated successfully")
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
            response = self.receive_message()
            if response and response.get('type') == 'room_joined':
                self.room_id = room_id
                print(f"✅ {self.name}: Joined room {room_id}")
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
    
    def send_message(self, message):
        """Send a message to the server"""
        try:
            data = json.dumps(message) + '\n'
            self.socket.send(data.encode('utf-8'))
            return True
        except Exception as e:
            print(f"❌ {self.name}: Error sending message: {e}")
            return False
    
    def receive_message(self):
        """Receive a message from the server"""
        try:
            data = self.socket.recv(4096)
            if data:
                message = json.loads(data.decode('utf-8').strip())
                return message
        except Exception as e:
            print(f"❌ {self.name}: Error receiving message: {e}")
        return None
    
    def listen_for_messages(self):
        """Listen for incoming messages"""
        while self.connected:
            try:
                message = self.receive_message()
                if message:
                    if message.get('type') == 'draw_data':
                        print(f"🎨 {self.name}: Received draw data: {message['data']}")
                        self.received_draw_data.append(message['data'])
                    elif message.get('type') == 'player_joined':
                        print(f"👤 {self.name}: Player joined: {message['username']}")
                    elif message.get('type') == 'player_left':
                        print(f"👤 {self.name}: Player left: {message['username']}")
                    else:
                        print(f"📨 {self.name}: Received: {message.get('type', 'unknown')}")
            except Exception as e:
                if self.connected:
                    print(f"❌ {self.name}: Error in message listener: {e}")
                break
    
    def close(self):
        """Close the connection"""
        self.connected = False
        if self.socket:
            self.socket.close()
        print(f"🔌 {self.name}: Connection closed")

def test_drawing_broadcast():
    """Test drawing data broadcasting between clients"""
    print("🎨 Testing Drawing Data Broadcasting")
    print("=" * 50)
    
    # Create two test clients
    client1 = DrawingTestClient("Client1")
    client2 = DrawingTestClient("Client2")
    
    try:
        # Connect both clients
        if not client1.connect() or not client2.connect():
            print("❌ Failed to connect clients")
            return
        
        # Authenticate both clients
        if not client1.authenticate() or not client2.authenticate():
            print("❌ Failed to authenticate clients")
            return
        
        # Join the same room
        room_id = 1
        if not client1.join_room(room_id) or not client2.join_room(room_id):
            print("❌ Failed to join room")
            return
        
        # Start message listeners in separate threads
        thread1 = threading.Thread(target=client1.listen_for_messages, daemon=True)
        thread2 = threading.Thread(target=client2.listen_for_messages, daemon=True)
        thread1.start()
        thread2.start()
        
        # Wait a moment for clients to settle
        time.sleep(1)
        
        # Client1 sends drawing data
        print(f"\n🎨 Client1 sending drawing data...")
        client1.send_drawing_data(100, 100, True, "#FF0000", 3)
        time.sleep(0.1)
        client1.send_drawing_data(150, 150, True, "#FF0000", 3)
        time.sleep(0.1)
        client1.send_drawing_data(200, 200, False, "#FF0000", 3)
        
        # Wait for messages to be processed
        time.sleep(2)
        
        # Check if Client2 received the drawing data
        if client2.received_draw_data:
            print(f"✅ SUCCESS: Client2 received {len(client2.received_draw_data)} drawing data points")
            for i, data in enumerate(client2.received_draw_data):
                print(f"   Point {i+1}: x={data['x']}, y={data['y']}, drawing={data['is_drawing']}")
        else:
            print("❌ FAILED: Client2 did not receive any drawing data")
        
        # Client2 sends drawing data
        print(f"\n🎨 Client2 sending drawing data...")
        client2.send_drawing_data(300, 300, True, "#0000FF", 2)
        time.sleep(0.1)
        client2.send_drawing_data(350, 350, True, "#0000FF", 2)
        time.sleep(0.1)
        client2.send_drawing_data(400, 400, False, "#0000FF", 2)
        
        # Wait for messages to be processed
        time.sleep(2)
        
        # Check if Client1 received the drawing data
        if client1.received_draw_data:
            print(f"✅ SUCCESS: Client1 received {len(client1.received_draw_data)} drawing data points")
            for i, data in enumerate(client1.received_draw_data):
                print(f"   Point {i+1}: x={data['x']}, y={data['y']}, drawing={data['is_drawing']}")
        else:
            print("❌ FAILED: Client1 did not receive any drawing data")
            
    except Exception as e:
        print(f"❌ Test error: {e}")
    finally:
        # Clean up
        client1.close()
        client2.close()
        print("\n🧹 Test completed")

if __name__ == "__main__":
    test_drawing_broadcast() 