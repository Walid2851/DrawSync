import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  SkipForward, 
  Trash2, 
  Users, 
  Clock, 
  Crown,
  Palette,
  MessageSquare,
  Wifi,
  WifiOff,
  CheckCircle,
  Circle
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DrawingCanvas from '../components/DrawingCanvas';
import ChatBox from '../components/ChatBox';
import Button from '../components/Button';
import RoundEndPopup from '../components/RoundEndPopup';
import GameEndPopup from '../components/GameEndPopup';
import useGameStore from '../store/gameStore';
import useAuthStore from '../store/authStore';
import socketManager from '../utils/socket';
import { roomsAPI } from '../utils/api';

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const {
    players,
    isInRoom,
    isGameActive,
    currentRound,
    totalRounds,
    timeRemaining,
    currentWord,
    isDrawing,
    drawingData,
    chatMessages,
    guessInput,
    isSocketConnected,
    isLoading,
    error,
    showRoundEndPopup,
    roundEndData,
    showGameEndPopup,
    gameEndData,
    joinRoom,
    leaveRoom,
    deleteRoom,
    setPlayers,
    addChatMessageFromSocket,
    addCorrectGuessMessage,
    setGuessInput,
    sendGuess,
    sendChatMessage,
    startGame,
    setReady,
    skipTurn,
    resetGameState,
    hideRoundEndPopup,
    hideGameEndPopup,
    handleSocketConnected,
    handleAuthenticated,
    handleRoomJoined,
    handlePlayerJoined,
    handlePlayerLeft,
    handleGameStarted,
    handleRoundStarted,
    handleWordAssigned,
    handleCorrectGuess,
    handleAllGuessed,
    handleRoundEnded,
    handleGameEnded,
    handleTimeUpdate,
    handleCanvasCleared,
    handleRoomDeleted,
    handlePlayersUpdate,
    handleDrawData,
    handleGameState,
  } = useGameStore();

  const [isReady, setIsReady] = useState(false);

  // Socket event handlers
  const handleSocketConnectedEvent = useCallback((data) => {
    handleSocketConnected(data);
  }, [handleSocketConnected]);

  const handleAuthenticatedEvent = useCallback((data) => {
    handleAuthenticated(data);
    // Join room after successful authentication
    console.log('Authentication successful, joining room...');
    joinRoom(parseInt(roomId));
  }, [handleAuthenticated, joinRoom, roomId]);

  const handleRoomJoinedEvent = useCallback((data) => {
    handleRoomJoined(data);
    toast.success('Joined room successfully!');
  }, [handleRoomJoined]);

  const handlePlayerJoinedEvent = useCallback((data) => {
    handlePlayerJoined(data);
    toast(`${data.username} joined the room`, {
      icon: '👤',
    });
  }, [handlePlayerJoined]);

  const handlePlayerLeftEvent = useCallback((data) => {
    handlePlayerLeft(data);
    toast(`${data.username} left the room`, {
      icon: '👤',
    });
  }, [handlePlayerLeft]);

  const handleGameStartedEvent = useCallback((data) => {
    handleGameStarted(data);
    toast.success('Game started!');
  }, [handleGameStarted]);

  const handleRoundStartedEvent = useCallback((data) => {
    handleRoundStarted(data);
    toast.success(`Round ${data.round} started!`);
  }, [handleRoundStarted]);

  const handleWordAssignedEvent = useCallback((data) => {
    handleWordAssigned(data);
    if (data.word && data.word !== '_' * data.word.length) {
      toast.success(`Your word: ${data.word}`);
    }
  }, [handleWordAssigned]);

  const handleCorrectGuessEvent = useCallback((data) => {
    handleCorrectGuess(data);
    toast.success(`${data.username} guessed correctly!`);
  }, [handleCorrectGuess]);

  const handleAllGuessedEvent = useCallback((data) => {
    handleAllGuessed(data);
    toast.success('Everyone guessed correctly! Round ending...');
  }, [handleAllGuessed]);

  const handleRoundEndedEvent = useCallback((data) => {
    handleRoundEnded(data);
    toast(`Round ${data.round} ended! Word was: ${data.word}`, {
      icon: '⏹️',
    });
  }, [handleRoundEnded]);

  const handleGameEndedEvent = useCallback((data) => {
    handleGameEnded(data);
    toast.success('Game ended!');
  }, [handleGameEnded]);

  const handleTimeUpdateEvent = useCallback((data) => {
    handleTimeUpdate(data);
  }, [handleTimeUpdate]);

  const handleCanvasClearedEvent = useCallback((data) => {
    handleCanvasCleared(data);
    toast('Canvas cleared', {
      icon: '🧹',
    });
  }, [handleCanvasCleared]);

  const handleRoomDeletedEvent = useCallback((data) => {
    handleRoomDeleted(data);
    toast.error('Room has been deleted');
    navigate('/dashboard');
  }, [handleRoomDeleted, navigate]);

  const handlePlayersUpdateEvent = useCallback((data) => {
    handlePlayersUpdate(data);
  }, [handlePlayersUpdate]);

  const handleChatMessageEvent = useCallback((data) => {
    addChatMessageFromSocket(data);
  }, [addChatMessageFromSocket]);

  const handleDrawDataEvent = useCallback((data) => {
    // Add incoming drawing data to the store
    handleDrawData(data);
    console.log('Draw data received:', data);
  }, [handleDrawData]);

  const handleGameStateEvent = useCallback((data) => {
    // Handle game state updates
    handleGameState(data);
    console.log('Game state update:', data);
  }, [handleGameState]);

  // Game controls
  const handleStartGame = () => {
    startGame();
  };

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    setReady(newReadyState);
  };

  const handleSkipTurn = () => {
    skipTurn();
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/dashboard');
  };

  const handleDeleteRoom = () => {
    if (window.confirm('Are you sure you want to delete this room? All players will be disconnected.')) {
      deleteRoom();
      navigate('/dashboard');
    }
  };

  const handleSendMessage = (message) => {
    sendChatMessage(message);
  };

  const handleSendGuess = () => {
    sendGuess();
  };

  const handleGoToDashboard = () => {
    hideRoundEndPopup();
    navigate('/dashboard');
  };

  const handleGoToDashboardFromGameEnd = () => {
    hideGameEndPopup();
    navigate('/dashboard');
  };

  // Check if current user is the drawer
  const isCurrentDrawer = isDrawing;

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    console.log('GameRoom: Setting up socket connection...');

    // Connect to socket
    socketManager.connect(token);

    // Register all event listeners
    socketManager.on('socket_connected', handleSocketConnectedEvent);
    socketManager.on('authenticated', handleAuthenticatedEvent);
    socketManager.on('room_joined', handleRoomJoinedEvent);
    socketManager.on('player_joined', handlePlayerJoinedEvent);
    socketManager.on('player_left', handlePlayerLeftEvent);
    socketManager.on('chat_message', handleChatMessageEvent);
    socketManager.on('game_started', handleGameStartedEvent);
    socketManager.on('round_started', handleRoundStartedEvent);
    socketManager.on('correct_guess', handleCorrectGuessEvent);
    socketManager.on('all_guessed', handleAllGuessedEvent);
    socketManager.on('round_ended', handleRoundEndedEvent);
    socketManager.on('game_ended', handleGameEndedEvent);
    socketManager.on('time_update', handleTimeUpdateEvent);
    socketManager.on('word_assigned', handleWordAssignedEvent);
    socketManager.on('game_state', handleGameStateEvent);
    socketManager.on('canvas_cleared', handleCanvasClearedEvent);
    socketManager.on('draw_data', handleDrawDataEvent);
    socketManager.on('room_deleted', handleRoomDeletedEvent);
    socketManager.on('players_update', handlePlayersUpdateEvent);

    // Initial fetch of players
    const fetchPlayers = async () => {
      try {
        const response = await roomsAPI.getRoomPlayers(roomId);
        if (response.data && response.data.players) {
          setPlayers(response.data.players);
        }
      } catch (err) {
        console.error('Failed to fetch players:', err);
      }
    };
    fetchPlayers();

    // Cleanup on unmount
    return () => {
      socketManager.off('socket_connected', handleSocketConnectedEvent);
      socketManager.off('authenticated', handleAuthenticatedEvent);
      socketManager.off('room_joined', handleRoomJoinedEvent);
      socketManager.off('player_joined', handlePlayerJoinedEvent);
      socketManager.off('player_left', handlePlayerLeftEvent);
      socketManager.off('chat_message', handleChatMessageEvent);
      socketManager.off('game_started', handleGameStartedEvent);
      socketManager.off('round_started', handleRoundStartedEvent);
      socketManager.off('correct_guess', handleCorrectGuessEvent);
      socketManager.off('all_guessed', handleAllGuessedEvent);
      socketManager.off('round_ended', handleRoundEndedEvent);
      socketManager.off('game_ended', handleGameEndedEvent);
      socketManager.off('time_update', handleTimeUpdateEvent);
      socketManager.off('word_assigned', handleWordAssignedEvent);
      socketManager.off('game_state', handleGameStateEvent);
      socketManager.off('canvas_cleared', handleCanvasClearedEvent);
      socketManager.off('draw_data', handleDrawDataEvent);
      socketManager.off('room_deleted', handleRoomDeletedEvent);
      socketManager.off('players_update', handlePlayersUpdateEvent);
    };
  }, [
    token,
    roomId,
    navigate,
    joinRoom,
    setPlayers,
    handleSocketConnectedEvent,
    handleAuthenticatedEvent,
    handleRoomJoinedEvent,
    handlePlayerJoinedEvent,
    handlePlayerLeftEvent,
    handleChatMessageEvent,
    handleGameStartedEvent,
    handleRoundStartedEvent,
    handleCorrectGuessEvent,
    handleAllGuessedEvent,
    handleRoundEndedEvent,
    handleGameEndedEvent,
    handleTimeUpdateEvent,
    handleWordAssignedEvent,
    handleGameStateEvent,
    handleCanvasClearedEvent,
    handleDrawDataEvent,
    handleRoomDeletedEvent,
    handlePlayersUpdateEvent,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="loading-spinner w-8 h-8"></div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Loading room...</h2>
          <p className="text-slate-600 mt-2">Connecting to your drawing space</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Connection Error</h2>
          <p className="text-slate-600 mt-2">{error}</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="game-layout">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-4 card p-6 mb-6"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold gradient-text">Room #{roomId}</h1>
                <div className="flex items-center space-x-6 text-sm text-slate-600 mt-1">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{players.length} players</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Palette className="w-4 h-4" />
                    <span>Round {currentRound}/{totalRounds}</span>
                  </div>
                  {isGameActive && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold text-slate-800">{timeRemaining}s</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    {isSocketConnected ? (
                      <>
                        <Wifi className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600 font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-red-500" />
                        <span className="text-red-600 font-medium">Disconnected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {!isGameActive && (
                <>
                  <Button
                    onClick={handleReadyToggle}
                    variant={isReady ? 'success' : 'secondary'}
                    className="flex items-center space-x-2"
                  >
                    {isReady ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    <span>{isReady ? 'Ready' : 'Not Ready'}</span>
                  </Button>
                  <Button 
                    onClick={handleStartGame} 
                    className="flex items-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Game</span>
                  </Button>
                </>
              )}
              {isGameActive && isCurrentDrawer && (
                <Button 
                  onClick={handleSkipTurn} 
                  variant="warning"
                  className="flex items-center space-x-2"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Skip Turn</span>
                </Button>
              )}
              <Button 
                onClick={handleLeaveRoom} 
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Leave</span>
              </Button>
              <Button 
                onClick={handleDeleteRoom} 
                variant="danger"
                className="flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Players Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="game-sidebar"
        >
          <div className="card p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Players</span>
            </h2>
            <div className="space-y-3">
              {players.map((player, index) => (
                <motion.div
                  key={`${player.id}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="player-item"
                >
                  <div className="player-avatar">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {player.username}
                      </span>
                      {player.ready && (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                      {isGameActive && isCurrentDrawer && player.id === user?.id && (
                        <Palette className="w-4 h-4 text-blue-500 animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Crown className="w-3 h-3 text-amber-500" />
                      <span className="text-sm font-semibold text-slate-700">
                        {player.score || 0} pts
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Game Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="game-main"
        >
          <div className="card p-6 h-full">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Drawing Canvas</span>
              </h2>
              {isGameActive && isCurrentDrawer && (
                <div className="glass-card p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-slate-700">Your word to draw:</span>
                    <span className="text-lg font-bold gradient-text">{currentWord}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="canvas-container">
              <DrawingCanvas width={800} height={600} />
            </div>
          </div>
        </motion.div>

        {/* Chat Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="game-sidebar"
        >
          <ChatBox
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            guessInput={guessInput}
            onGuessInputChange={setGuessInput}
            onSendGuess={handleSendGuess}
            isGameActive={isGameActive}
          />
        </motion.div>
      </div>

      {/* Round End Popup */}
      <RoundEndPopup
        isOpen={showRoundEndPopup}
        onClose={hideRoundEndPopup}
        roundNumber={roundEndData?.roundNumber || 0}
        word={roundEndData?.word || ''}
        players={roundEndData?.players || []}
        onGoToDashboard={handleGoToDashboard}
      />

      {/* Game End Popup */}
      <GameEndPopup
        isOpen={showGameEndPopup}
        onClose={hideGameEndPopup}
        finalScores={gameEndData?.finalScores || {}}
        players={gameEndData?.players || []}
        onGoToDashboard={handleGoToDashboardFromGameEnd}
      />
    </div>
  );
};

export default GameRoom; 