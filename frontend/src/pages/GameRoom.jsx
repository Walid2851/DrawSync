import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Settings, 
  Palette,
  RotateCcw,
  Users,
  MessageCircle,
  Timer,
  Target,
  SkipForward,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useGameStore from '../store/gameStore';
import socketManager from '../utils/socket';
import DrawingCanvas from '../components/DrawingCanvas';
import ChatBox from '../components/ChatBox';
import PlayerList from '../components/PlayerList';
import Button from '../components/Button';
import { roomsAPI } from '../utils/api';

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const {
    currentRoom,
    players,
    isGameActive,
    gameState,
    currentRound,
    totalRounds,
    timeRemaining,
    currentWord,
    brushColor,
    brushSize,
    setBrushColor,
    setBrushSize,
    setReady,
    setSocketConnected,
    leaveRoom,
    clearDrawing,
    updateTimeRemaining,
    handleGameStarted,
    handleRoundStarted,
    handleCorrectGuess,
    handleRoundEnded,
    handleGameEnded,
  } = useGameStore();

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const timeIntervalRef = useRef(null);

  // Define event handlers using useCallback to avoid dependency issues
  const handleSocketConnected = useCallback((data) => {
    console.log('Socket connection state changed:', data);
    setSocketConnected(data.connected);
    
    // If connected and authenticated, join the room
    if (data.connected) {
      console.log('Socket connected, joining room:', roomId);
      socketManager.joinRoom(roomId);
    }
  }, [roomId, setSocketConnected]);

  const handleAuthenticated = useCallback((data) => {
    console.log('Authentication successful, joining room:', roomId);
    socketManager.joinRoom(roomId);
  }, [roomId]);

  const handleRoomJoined = useCallback((data) => {
    console.log('Room joined successfully:', data);
    toast.success('Joined room successfully!');
    // Fetch players after joining room
    const fetchPlayers = async () => {
      try {
        const response = await roomsAPI.getRoomPlayers(roomId);
        if (response.data && response.data.players) {
          useGameStore.getState().setPlayers(response.data.players);
        }
      } catch (err) {
        console.error('Failed to fetch players:', err);
      }
    };
    fetchPlayers();
  }, [roomId]);

  const handlePlayerJoined = useCallback((data) => {
    toast.success(`${data.username} joined the room`);
    // Fetch updated player list
    const fetchPlayers = async () => {
      try {
        const response = await roomsAPI.getRoomPlayers(roomId);
        if (response.data && response.data.players) {
          useGameStore.getState().setPlayers(response.data.players);
        }
      } catch (err) {
        console.error('Failed to fetch players:', err);
      }
    };
    fetchPlayers();
  }, [roomId]);

  const handlePlayerLeft = useCallback((data) => {
    toast.info(`${data.username} left the room`);
    // Fetch updated player list
    const fetchPlayers = async () => {
      try {
        const response = await roomsAPI.getRoomPlayers(roomId);
        if (response.data && response.data.players) {
          useGameStore.getState().setPlayers(response.data.players);
        }
      } catch (err) {
        console.error('Failed to fetch players:', err);
      }
    };
    fetchPlayers();
  }, [roomId]);

  const handleChatMessage = useCallback((data) => {
    console.log('Received chat_message event:', data);
    useGameStore.getState().addChatMessageFromSocket(data);
  }, []);

  const handleGameStartedEvent = useCallback((data) => {
    console.log('Game started event received:', data);
    toast.success('Game started!');
    handleGameStarted(data);
  }, [handleGameStarted]);

  const handleRoundStartedEvent = useCallback((data) => {
    console.log('Round started event received:', data);
    toast.success(`Round ${data.round} started!`);
    handleRoundStarted(data);
  }, [handleRoundStarted]);

  const handleCorrectGuessEvent = useCallback((data) => {
    console.log('Correct guess event received:', data);
    toast.success(`${data.username} guessed correctly!`);
    handleCorrectGuess(data);
  }, [handleCorrectGuess]);

  const handleRoundEndedEvent = useCallback((data) => {
    console.log('Round ended event received:', data);
    toast.info('Round ended!');
    handleRoundEnded(data);
  }, [handleRoundEnded]);

  const handleGameEndedEvent = useCallback((data) => {
    console.log('Game ended event received:', data);
    toast.success('Game ended!');
    handleGameEnded(data);
  }, [handleGameEnded]);

  const handleTimeUpdate = useCallback((data) => {
    updateTimeRemaining(data.time_remaining);
  }, [updateTimeRemaining]);

  const handleDrawerChanged = useCallback((data) => {
    toast.info(`${data.username} is now drawing`);
  }, []);

  const handleWordAssigned = useCallback((data) => {
    if (data.user_id === user?.id) {
      toast.success(`Your word: ${data.word}`);
    }
  }, [user?.id]);

  const handleGameStateUpdate = useCallback((data) => {
    console.log('Game state update received:', data);
    // Update the game state in the store
    useGameStore.getState().setGameState(data);
  }, []);

  const handleCanvasCleared = useCallback((data) => {
    console.log('Canvas cleared event received:', data);
    // Clear the drawing data in the store
    useGameStore.getState().clearDrawing();
  }, []);

  const handleDrawData = useCallback((data) => {
    console.log('Draw data received:', data);
    // Add the drawing data to the store
    if (data.data) {
      useGameStore.getState().addDrawingData(data.data);
    }
  }, []);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
  ];

  const brushSizes = [2, 4, 6, 8, 12, 16];

  // Check if current user is the drawer
  const isCurrentDrawer = gameState?.current_drawer_id === user?.id;

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    console.log('GameRoom: Setting up socket connection...');

    // Connect to socket
    socketManager.connect(token);

    // Initial fetch of players
    const fetchPlayers = async () => {
      try {
        const response = await roomsAPI.getRoomPlayers(roomId);
        if (response.data && response.data.players) {
          useGameStore.getState().setPlayers(response.data.players);
        }
      } catch (err) {
        console.error('Failed to fetch players:', err);
      }
    };
    fetchPlayers();

    // Register all event listeners
    socketManager.on('socket_connected', handleSocketConnected);
    socketManager.on('authenticated', handleAuthenticated);
    socketManager.on('room_joined', handleRoomJoined);
    socketManager.on('player_joined', handlePlayerJoined);
    socketManager.on('player_left', handlePlayerLeft);
    socketManager.on('chat_message', handleChatMessage);
    socketManager.on('game_started', handleGameStartedEvent);
    socketManager.on('round_started', handleRoundStartedEvent);
    socketManager.on('correct_guess', handleCorrectGuessEvent);
    socketManager.on('round_ended', handleRoundEndedEvent);
    socketManager.on('game_ended', handleGameEndedEvent);
    socketManager.on('time_update', handleTimeUpdate);
    socketManager.on('drawer_changed', handleDrawerChanged);
    socketManager.on('word_assigned', handleWordAssigned);
    socketManager.on('game_state', handleGameStateUpdate);
    socketManager.on('canvas_cleared', handleCanvasCleared);
    socketManager.on('draw_data', handleDrawData);

    // Initial fetch of players
    fetchPlayers();

    return () => {
      // Clean up event listeners
      socketManager.off('socket_connected', handleSocketConnected);
      socketManager.off('authenticated', handleAuthenticated);
      socketManager.off('room_joined', handleRoomJoined);
      socketManager.off('player_joined', handlePlayerJoined);
      socketManager.off('player_left', handlePlayerLeft);
      socketManager.off('chat_message', handleChatMessage);
      socketManager.off('game_started', handleGameStartedEvent);
      socketManager.off('round_started', handleRoundStartedEvent);
      socketManager.off('correct_guess', handleCorrectGuessEvent);
      socketManager.off('round_ended', handleRoundEndedEvent);
      socketManager.off('game_ended', handleGameEndedEvent);
      socketManager.off('time_update', handleTimeUpdate);
      socketManager.off('drawer_changed', handleDrawerChanged);
      socketManager.off('word_assigned', handleWordAssigned);
      socketManager.off('game_state', handleGameStateUpdate);
      socketManager.off('canvas_cleared', handleCanvasCleared);
      socketManager.off('draw_data', handleDrawData);
    };
  }, [
    token,
    navigate,
    roomId,
    handleSocketConnected,
    handleAuthenticated,
    handleRoomJoined,
    handlePlayerJoined,
    handlePlayerLeft,
    handleChatMessage,
    handleGameStartedEvent,
    handleRoundStartedEvent,
    handleCorrectGuessEvent,
    handleRoundEndedEvent,
    handleGameEndedEvent,
    handleTimeUpdate,
    handleDrawerChanged,
    handleWordAssigned,
    handleGameStateUpdate,
    handleCanvasCleared,
    handleDrawData
  ]);

  const handleLeaveRoom = () => {
    leaveRoom();
    socketManager.disconnect();
    navigate('/dashboard');
  };

  const handleStartGame = async () => {
    try {
      socketManager.startGame(roomId);
    } catch (error) {
      toast.error('Failed to start game');
    }
  };

  const handleSkipTurn = () => {
    if (isCurrentDrawer) {
      socketManager.skipTurn();
    }
  };

  const handleClearCanvas = () => {
    if (isCurrentDrawer) {
      clearDrawing();
      socketManager.clearCanvas();
    }
  };

  const handleReadyToggle = () => {
    setIsReady(!isReady);
    setReady(!isReady);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={handleLeaveRoom}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Leave Room</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Room: {currentRoom?.name || roomId}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Game Status */}
            {isGameActive && (
              <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium">
                    Round {currentRound}/{totalRounds}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPlayerList(!showPlayerList)}
                className="flex items-center space-x-1"
              >
                <Users className="w-4 h-4" />
                <span>Players</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="flex items-center space-x-1"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center space-x-1"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Drawing Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Drawing Canvas</h2>
                
                {isGameActive && isCurrentDrawer && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearCanvas}
                      className="flex items-center space-x-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Clear</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSkipTurn}
                      className="flex items-center space-x-1"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>Skip</span>
                    </Button>
                  </div>
                )}
              </div>

              <DrawingCanvas width={800} height={600} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Game Controls */}
            {!isGameActive && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Game Controls</h3>
                <div className="space-y-3">
                  <Button
                    onClick={handleStartGame}
                    className="w-full"
                    disabled={players.length < 3}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Game
                  </Button>
                  
                  <Button
                    variant={isReady ? "default" : "outline"}
                    onClick={handleReadyToggle}
                    className="w-full"
                  >
                    {isReady ? "Ready" : "Not Ready"}
                  </Button>
                </div>
                
                {players.length < 3 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Need at least 3 players to start
                  </p>
                )}
              </div>
            )}

            {/* Player List */}
            {showPlayerList && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <PlayerList players={players} />
              </div>
            )}

            {/* Chat */}
            {showChat && (
              <ChatBox />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom; 