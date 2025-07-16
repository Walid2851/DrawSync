#!/usr/bin/env python3
"""
Start both the Python socket server and WebSocket bridge
"""

import threading
import time
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.socket_server import start_socket_server
from app.websocket_bridge import start_websocket_bridge
import asyncio

def run_socket_server():
    """Run the Python socket server in a separate thread"""
    print("🚀 Starting Python Socket Server...")
    start_socket_server()

def run_websocket_bridge():
    """Run the WebSocket bridge"""
    print("🌉 Starting WebSocket Bridge...")
    asyncio.run(start_websocket_bridge())

def main():
    """Start both services"""
    print("🎮 Starting DrawSync Socket Services...")
    print("=" * 50)
    
    # Start Python socket server in a separate thread
    socket_thread = threading.Thread(target=run_socket_server, daemon=True)
    socket_thread.start()
    
    # Give the socket server a moment to start
    time.sleep(2)
    
    # Start WebSocket bridge in the main thread
    try:
        run_websocket_bridge()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down services...")
        sys.exit(0)

if __name__ == "__main__":
    main() 