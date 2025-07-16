#!/bin/bash

# DrawSync Backend Quick Start Script

echo "🚀 DrawSync Backend Quick Start"
echo "================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip first."
    exit 1
fi

echo "✅ Python and pip found"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp env.example .env
    echo "✅ .env file created. You can edit it to customize settings."
fi

# Initialize database
echo "🗄️  Initializing database..."
python -c "from app.database import engine; from app.models import user, game_room, game_session, player_stats; user.Base.metadata.create_all(bind=engine)"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the backend:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Run both servers: python run.py"
echo ""
echo "Or run servers separately:"
echo "Terminal 1: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "Terminal 2: python -m app.socket_server"
echo ""
echo "Access points:"
echo "- FastAPI Server: http://localhost:8000"
echo "- API Docs: http://localhost:8000/docs"
echo "- Socket Server: localhost:8001"
echo ""
echo "To test the backend:"
echo "- API tests: python test_backend.py"
echo "- Socket tests: python test_socket.py" 