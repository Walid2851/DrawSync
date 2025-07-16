#!/bin/bash

# DrawSync Quick Start Script
# This script starts all necessary services for testing the game

echo "🎮 Starting DrawSync Game Services..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check if ports are available
echo "🔍 Checking port availability..."
check_port 8000 || exit 1
check_port 8001 || exit 1
check_port 3000 || exit 1

# Function to start backend API
start_backend() {
    echo "🚀 Starting Backend API on port 8000..."
    cd backend
    source venv/bin/activate
    python run.py &
    BACKEND_PID=$!
    echo "✅ Backend API started (PID: $BACKEND_PID)"
    cd ..
}

# Function to start socket server
start_socket() {
    echo "🔌 Starting Socket Server on port 8001..."
    cd backend
    source venv/bin/activate
    python start_socket_server.py &
    SOCKET_PID=$!
    echo "✅ Socket Server started (PID: $SOCKET_PID)"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "🌐 Starting Frontend on port 3000..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    echo "✅ Frontend started (PID: $FRONTEND_PID)"
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Backend API stopped"
    fi
    if [ ! -z "$SOCKET_PID" ]; then
        kill $SOCKET_PID 2>/dev/null
        echo "✅ Socket Server stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend stopped"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start services
start_backend
sleep 2

start_socket
sleep 2

start_frontend
sleep 2

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "🔌 Socket Server: ws://localhost:8001"
echo ""
echo "📋 Test Instructions:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Register/login with test accounts"
echo "3. Create or join a room"
echo "4. Start the game and test drawing/guessing"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
wait 