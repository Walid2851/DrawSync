# DrawSync - Multiplayer Drawing Game

A real-time multiplayer drawing game similar to skribbl.io, built with FastAPI, Python sockets, and React.

## Features

- Real-time drawing canvas with WebSocket communication
- Game room management with private/public rooms
- Turn-based gameplay with automatic rotation
- Word selection and scoring system
- Real-time chat system
- Player authentication and profiles
- Leaderboards and statistics

## Backend Architecture

- **FastAPI**: REST API endpoints
- **Raw Python Sockets**: Low-level TCP socket communication for drawing and chat
- **WebSocket Bridge**: Browser-compatible WebSocket interface
- **SQLAlchemy**: Database ORM
- **Redis**: Session management and caching

## Project Structure

```
drawsync/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/
│   │   ├── core/
│   │   └── services/
│   ├── requirements.txt
│   └── README.md
├── frontend/
└── README.md
```

## Setup Instructions

### Backend Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run all backend services:
```bash
python start_drawsync.py
```

Or run services separately:
```bash
# Terminal 1: FastAPI Server
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Socket Services (Python Socket Server + WebSocket Bridge)
cd backend && python start_socket_services.py
```

## API Documentation

Once the server is running, visit:
- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Socket Events

### Client to Server
- `join_room`: Join a game room
- `leave_room`: Leave current room
- `draw`: Send drawing data
- `chat_message`: Send chat message
- `guess_word`: Submit word guess
- `ready`: Player ready status

### Server to Client
- `player_joined`: New player joined
- `player_left`: Player left
- `draw_data`: Drawing data from other players
- `chat_message`: Chat message from other players
- `game_state`: Current game state
- `turn_update`: Turn change notification
- `word_assigned`: Word assigned to drawer
- `guess_result`: Result of word guess
- `game_end`: Game ended with results 