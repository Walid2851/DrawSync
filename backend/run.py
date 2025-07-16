#!/usr/bin/env python3
"""
Run script for DrawSync backend
Starts both the FastAPI server and the socket server
"""

import subprocess
import sys
import time
import signal
import os
from threading import Thread

def run_fastapi():
    """Run the FastAPI server"""
    subprocess.run([
        sys.executable, "-m", "uvicorn", 
        "app.main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000", 
        "--reload"
    ])

def run_socket_server():
    """Run the socket server"""
    subprocess.run([
        sys.executable, "start_socket_server.py"
    ])

def main():
    print("Starting DrawSync Backend...")
    print("FastAPI Server: http://localhost:8000")
    print("Socket Server: localhost:8001")
    print("API Documentation: http://localhost:8000/docs")
    print("Press Ctrl+C to stop both servers")
    
    # Start FastAPI server in a separate thread
    fastapi_thread = Thread(target=run_fastapi, daemon=True)
    fastapi_thread.start()
    
    # Give FastAPI a moment to start
    time.sleep(2)
    
    # Start socket server in main thread
    try:
        run_socket_server()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        sys.exit(0)

if __name__ == "__main__":
    main() 