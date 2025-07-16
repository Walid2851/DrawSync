#!/usr/bin/env python3
"""
Main startup script for DrawSync - starts all services
"""

import subprocess
import sys
import os
import time
import signal
import threading

def start_fastapi_server():
    """Start the FastAPI server"""
    print("🚀 Starting FastAPI Server...")
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "backend.app.main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ], cwd=".")
    except KeyboardInterrupt:
        print("🛑 FastAPI Server stopped")

def start_socket_services():
    """Start the socket services"""
    print("🎮 Starting Socket Services...")
    try:
        subprocess.run([
            sys.executable, "backend/start_socket_services.py"
        ], cwd=".")
    except KeyboardInterrupt:
        print("🛑 Socket Services stopped")

def main():
    """Start all DrawSync services"""
    print("🎨 DrawSync - Multiplayer Drawing Game")
    print("=" * 50)
    print("Starting all services...")
    print()
    
    # Start FastAPI server in a separate thread
    fastapi_thread = threading.Thread(target=start_fastapi_server, daemon=True)
    fastapi_thread.start()
    
    # Give FastAPI a moment to start
    time.sleep(3)
    
    # Start socket services in main thread
    try:
        start_socket_services()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down DrawSync...")
        sys.exit(0)

if __name__ == "__main__":
    main() 