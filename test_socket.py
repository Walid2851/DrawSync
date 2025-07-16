#!/usr/bin/env python3
"""
Simple test script to verify socket server functionality
"""

import socketio
import asyncio
import time
import json

# Create Socket.IO client
sio = socketio.AsyncClient()

# Test data
TEST_TOKEN = "your_test_token_here"  # Replace with actual token
TEST_ROOM_ID = 1

@sio.event
async def connect():
    print("✅ Connected to socket server")

@sio.event
async def disconnect():
    print("❌ Disconnected from socket server")

@sio.event
async def authenticated(data):
    print(f"✅ Authenticated: {data}")

@sio.event
async def room_joined(data):
    print(f"✅ Joined room: {data}")

@sio.event
async def player_joined(data):
    print(f"👤 Player joined: {data}")

@sio.event
async def player_left(data):
    print(f"👤 Player left: {data}")

@sio.event
async def chat_message(data):
    print(f"💬 Chat message: {data}")

@sio.event
async def game_started(data):
    print(f"🎮 Game started: {data}")

@sio.event
async def game_state(data):
    print(f"🎮 Game state: {data}")

@sio.event
async def word_guessed(data):
    print(f"🎉 Word guessed: {data}")

@sio.event
async def game_ended(data):
    print(f"🏁 Game ended: {data}")

@sio.event
async def draw_data(data):
    print(f"🎨 Draw data: {data}")

async def test_socket_connection():
    """Test basic socket functionality"""
    try:
        # Connect to socket server
        await sio.connect('http://localhost:8001')
        print("🔌 Connected to socket server")
        
        # Authenticate
        await sio.emit('authenticate', {'token': TEST_TOKEN})
        print("🔐 Sent authentication request")
        
        # Wait for authentication
        await asyncio.sleep(2)
        
        # Join room
        await sio.emit('join_room', {'room_id': TEST_ROOM_ID})
        print(f"🚪 Sent join room request for room {TEST_ROOM_ID}")
        
        # Wait for room join
        await asyncio.sleep(2)
        
        # Send a chat message
        await sio.emit('chat_message', {'message': 'Hello from test script!'})
        print("💬 Sent test chat message")
        
        # Wait a bit
        await asyncio.sleep(5)
        
        # Disconnect
        await sio.disconnect()
        print("🔌 Disconnected from socket server")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🧪 Starting socket server test...")
    print("Make sure the socket server is running on port 8001")
    print("Update TEST_TOKEN with a valid JWT token")
    
    # Run the test
    asyncio.run(test_socket_connection()) 