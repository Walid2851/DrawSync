# DrawSync Frontend

A modern React frontend for the DrawSync multiplayer drawing game, built with React, Tailwind CSS, and Socket.IO.

## Features

- **Modern UI/UX**: Beautiful, responsive design with smooth animations
- **Real-time Drawing**: Interactive canvas with real-time synchronization
- **User Authentication**: Secure login/registration system
- **Room Management**: Create and join game rooms
- **Live Chat**: Real-time messaging and word guessing
- **Player Management**: Track players, scores, and game status
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Socket.IO Client**: Real-time communication
- **Zustand**: Lightweight state management
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Beautiful icons
- **React Hot Toast**: Toast notifications
- **Axios**: HTTP client for API calls

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend server running (see backend README)

### Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

The app will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── DrawingCanvas.jsx
│   │   ├── ChatBox.jsx
│   │   └── PlayerList.jsx
│   ├── pages/              # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   └── GameRoom.jsx
│   ├── store/              # State management
│   │   ├── authStore.js
│   │   └── gameStore.js
│   ├── utils/              # Utility functions
│   │   ├── api.js
│   │   └── socket.js
│   ├── App.jsx             # Main app component
│   ├── index.js            # Entry point
│   └── index.css           # Global styles
├── package.json
├── tailwind.config.js
└── README.md
```

## Key Components

### DrawingCanvas
Interactive canvas component that handles:
- Mouse and touch drawing
- Real-time drawing synchronization
- Brush color and size controls
- Drawing permissions (only current drawer can draw)

### ChatBox
Real-time chat component with:
- Message history
- Word guessing during games
- User-friendly interface
- Auto-scroll to latest messages

### GameRoom
Main game interface featuring:
- Drawing canvas
- Player list
- Chat system
- Game controls
- Timer display
- Room information

## State Management

### AuthStore (Zustand)
Manages authentication state:
- User login/logout
- Token management
- User data persistence
- Authentication status

### GameStore (Zustand)
Manages game state:
- Room information
- Player data
- Game progress
- Drawing data
- Chat messages

## API Integration

The frontend communicates with the backend through:
- **REST API**: User authentication, room management
- **WebSocket**: Real-time game events, drawing data, chat

## Styling

The app uses Tailwind CSS for styling with:
- Custom color palette
- Responsive design
- Dark/light mode support
- Smooth animations
- Modern UI components

## Development

### Available Scripts

- `npm start`: Start development server
- `npm run build`: Build for production
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App

### Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SOCKET_URL=http://localhost:8001
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 

source venv/bin/activate && python -m app.websocket_bridge
source venv/bin/activate && python -m app.socket_server