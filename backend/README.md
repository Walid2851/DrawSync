# DrawSync Backend

A real-time multiplayer drawing game backend built with FastAPI and raw Python sockets, similar to skribbl.io.

## Features

- **Real-time Drawing**: Raw TCP socket-based drawing synchronization
- **Game Rooms**: Create and join public/private game rooms
- **Turn-based Gameplay**: Automatic turn rotation with timers
- **Word System**: Random word assignment with difficulty levels
- **Chat System**: Real-time chat for guesses and communication
- **User Authentication**: JWT-based authentication system
- **Player Statistics**: Track scores, games played, and leaderboards
- **Reliable Communication**: Raw TCP socket implementation for fault-tolerant data transfer

## Architecture

### Components

1. **FastAPI Server** (Port 8000): REST API endpoints for user management, room management, and game logic
2. **Python Socket Server** (Port 8001): Raw TCP socket server for real-time communication
3. **WebSocket Bridge** (Port 8002): WebSocket bridge to connect browsers to the socket server
4. **Database**: SQLite (default) or PostgreSQL for data persistence
5. **Word Manager**: Curated word database with difficulty levels

### Technology Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **Raw Python Sockets**: Low-level TCP socket communication using `socket` module
- **WebSockets**: WebSocket bridge for browser compatibility
- **JWT**: JSON Web Tokens for authentication
- **Pydantic**: Data validation using Python type annotations
- **Uvicorn**: ASGI server for FastAPI

## Setup Instructions

### Prerequisites

- Python 3.8+
- pip (Python package installer)

### Installation

1. **Clone the repository and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize the database:**
   ```bash
   python -c "from app.database import engine; from app.models import user, game_room, game_session, player_stats; user.Base.metadata.create_all(bind=engine)"
   ```

### Running the Application

#### Option 1: Run all services together
```bash
python start_socket_services.py
```

#### Option 2: Run services separately

**Terminal 1 - FastAPI Server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Python Socket Server:**
```bash
python -m app.socket_server
```

**Terminal 3 - WebSocket Bridge:**
```bash
python -m app.websocket_bridge
```

### Access Points

- **FastAPI Server**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc
- **Python Socket Server**: localhost:8001
- **WebSocket Bridge**: ws://localhost:8002

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token
- `GET /auth/me` - Get current user info

### Game Rooms
- `POST /rooms/` - Create a new game room
- `POST /rooms/join` - Join a game room
- `POST /rooms/{room_id}/leave` - Leave a game room
- `GET /rooms/` - Get all public rooms
- `GET /rooms/{room_code}` - Get room by code
- `GET /rooms/{room_id}/players` - Get room players

### Game Logic
- `POST /games/{room_id}/start` - Start a game
- `GET /games/{room_id}/state` - Get game state
- `POST /games/{room_id}/draw` - Submit drawing data
- `POST /games/{room_id}/guess` - Submit word guess
- `GET /games/rooms/public` - Get public rooms

### User Management
- `GET /users/stats` - Get user statistics
- `GET /users/leaderboard` - Get leaderboard

## Socket Events

### Client to Server
- `authenticate` - Authenticate with JWT token
- `join_room` - Join a game room
- `leave_room` - Leave current room
- `draw` - Send drawing data
- `chat_message` - Send chat message
- `guess_word` - Submit word guess
- `ready` - Set player ready status

### Server to Client
- `authenticated` - Authentication successful
- `player_joined` - New player joined room
- `player_left` - Player left room
- `room_joined` - Successfully joined room
- `draw_data` - Drawing data from other players
- `chat_message` - Chat message from other players
- `guess_result` - Result of word guess
- `word_guessed` - Word was correctly guessed
- `player_ready` - Player ready status update
- `player_disconnected` - Player disconnected
- `error` - Error message

## Database Schema

### Users
- User accounts with authentication
- Username, email, hashed password

### Game Rooms
- Game room information
- Room code, settings, current state

### Game Sessions
- Player sessions in rooms
- Session tokens, scores, ready status

### Player Stats
- Player statistics and achievements
- Games played, scores, leaderboard data

## Configuration

Key configuration options in `.env`:

```env
# Game Settings
MAX_PLAYERS_PER_ROOM=8
MIN_PLAYERS_TO_START=2
DRAWING_TIME_LIMIT=60
ROUNDS_PER_GAME=5

# Security
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite:///./drawsync.db
```

## Development

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database setup
│   ├── socket_server.py     # Socket server
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── api/                 # API routes
│   ├── core/                # Core functionality
│   └── services/            # Business logic
├── requirements.txt
├── env.example
├── words.txt
└── run.py
```

### Adding New Features

1. **Models**: Add SQLAlchemy models in `app/models/`
2. **Schemas**: Add Pydantic schemas in `app/schemas/`
3. **Services**: Add business logic in `app/services/`
4. **API Routes**: Add endpoints in `app/api/`
5. **Socket Events**: Add handlers in `app/socket_server.py`

## Testing

### Manual Testing

1. **Register a user:**
   ```bash
   curl -X POST "http://localhost:8000/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
   ```

2. **Login:**
   ```bash
   curl -X POST "http://localhost:8000/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser","password":"password123"}'
   ```

3. **Create a room:**
   ```bash
   curl -X POST "http://localhost:8000/rooms/" \
        -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Test Room","is_private":false}'
   ```

### Socket Testing

Use a WebSocket client or create a simple Python script:

```python
import socket
import json

# Connect to socket server
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('localhost', 8001))

# Authenticate
auth_message = {
    'type': 'authenticate',
    'token': 'YOUR_JWT_TOKEN'
}
sock.send(json.dumps(auth_message).encode())

# Join room
join_message = {
    'type': 'join_room',
    'room_id': 1
}
sock.send(json.dumps(join_message).encode())
```

## Deployment

### Production Considerations

1. **Security**: Change default secret key
2. **Database**: Use PostgreSQL for production
3. **Redis**: Configure Redis for session management
4. **HTTPS**: Use SSL/TLS certificates
5. **Load Balancing**: Use multiple socket server instances
6. **Monitoring**: Add logging and monitoring

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000 8001

CMD ["python", "run.py"]
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change ports in `.env`
2. **Database errors**: Check database URL and permissions
3. **Socket connection failed**: Ensure socket server is running
4. **Import errors**: Check Python path and virtual environment

### Logs

- FastAPI logs: Check terminal output
- Socket server logs: Check terminal output
- Database logs: Check database configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 