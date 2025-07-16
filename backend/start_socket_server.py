#!/usr/bin/env python3
"""
Simple script to start the Socket.IO server
"""

import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.socket_server import start_socket_server

if __name__ == "__main__":
    print("Starting DrawSync Socket Server...")
    try:
        start_socket_server()
    except KeyboardInterrupt:
        print("Shutting down Socket Server...") 