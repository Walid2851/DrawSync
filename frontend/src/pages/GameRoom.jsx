import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DrawingCanvas from '../components/DrawingCanvas';
import ChatBox from '../components/ChatBox';
import Button from '../components/Button';
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
    handleSocketConnected,
    handleAuthenticated,
    handleRoomJoined,
    handlePlayerJoined,
    handlePlayerLeft,
    handleGameStarted,
    handleRoundStarted,
    handleWordAssigned,
    handleCorrectGuess,
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Room {roomId}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Players: {players.length}</span>
                <span>Round: {currentRound}/{totalRounds}</span>
                {isGameActive && <span>Time: {timeRemaining}s</span>}
                {isSocketConnected ? (
                  <span className="text-green-500">● Connected</span>
                ) : (
                  <span className="text-red-500">● Disconnected</span>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {!isGameActive && (
                <>
                  <Button
                    onClick={handleReadyToggle}
                    variant={isReady ? 'success' : 'secondary'}
                  >
                    {isReady ? 'Ready' : 'Not Ready'}
                  </Button>
                  <Button onClick={handleStartGame} variant="primary">
                    Start Game
                  </Button>
                </>
              )}
              {isGameActive && isCurrentDrawer && (
                <Button onClick={handleSkipTurn} variant="warning">
                  Skip Turn
                </Button>
              )}
              <Button onClick={handleLeaveRoom} variant="secondary">
                Leave Room
              </Button>
              <Button onClick={handleDeleteRoom} variant="danger">
                Delete Room
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Players Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-4">Players</h2>
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div
                    key={`${player.id}-${index}`}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{player.username}</span>
                      {player.ready && (
                        <span className="text-green-500 text-sm">✓</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      {player.score || 0} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Drawing Canvas</h2>
                {isGameActive && isCurrentDrawer && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span>Your turn to draw! Word: {currentWord}</span>
                  </div>
                )}
              </div>
              <DrawingCanvas width={800} height={600} />
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-1">
            <ChatBox
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              guessInput={guessInput}
              onGuessInputChange={setGuessInput}
              onSendGuess={handleSendGuess}
              isGameActive={isGameActive}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom; 