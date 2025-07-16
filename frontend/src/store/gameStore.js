import { create } from 'zustand';
import socketManager from '../utils/socket';

const useGameStore = create((set, get) => ({
  // Room state
  currentRoom: null,
  players: [],
  isInRoom: false,

  // Game state
  gameState: null,
  isGameActive: false,
  currentRound: 0,
  totalRounds: 5,
  timeRemaining: 0,
  currentWord: '',
  isDrawing: false,
  currentDrawer: null,
  guessedPlayers: [],
  guessProgress: { guessed: 0, total: 0 },

  // Drawing state
  drawingData: [],
  brushColor: '#000000',
  brushSize: 2,
  isDrawingMode: false,

  // Chat state
  chatMessages: [],
  guessInput: '',

  // Socket state
  isSocketConnected: false,

  // UI state
  isLoading: false,
  error: null,
  showRoundEndPopup: false,
  roundEndData: null,
  showGameEndPopup: false,
  gameEndData: null,

  // Actions
  setSocketConnected: (connected) => {
    set({ isSocketConnected: connected });
  },

  joinRoom: (roomId) => {
    set({ isLoading: true, error: null });
    socketManager.joinRoom(roomId);
    set({ isInRoom: true, isLoading: false });
  },

  leaveRoom: () => {
    socketManager.leaveRoom();
    set({
      currentRoom: null,
      players: [],
      isInRoom: false,
      gameState: null,
      isGameActive: false,
      chatMessages: [],
      drawingData: [],
    });
  },

  deleteRoom: () => {
    socketManager.deleteRoom();
    set({
      currentRoom: null,
      players: [],
      isInRoom: false,
      gameState: null,
      isGameActive: false,
      chatMessages: [],
      drawingData: [],
    });
  },

  setRoomData: (roomData) => {
    set({ currentRoom: roomData });
  },

  setPlayers: (players) => {
    // Ensure players array is unique by ID
    const uniquePlayers = players.filter((player, index, self) => 
      index === self.findIndex(p => p.id === player.id)
    );
    set({ players: uniquePlayers });
  },

  addPlayer: (player) => {
    set((state) => {
      // Check if player already exists
      const existingPlayer = state.players.find(p => p.id === player.id);
      if (existingPlayer) {
        return state; // Player already exists, don't add duplicate
      }
      
      return {
        players: [...state.players, player],
      };
    });
  },

  removePlayer: (playerId) => {
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    }));
  },

  setGameState: (gameState) => {
    set((state) => ({
      gameState: { ...state.gameState, ...gameState },
      isGameActive: gameState.game_started !== undefined ? gameState.game_started : state.isGameActive,
      currentRound: gameState.current_round || state.currentRound,
      totalRounds: gameState.max_rounds || state.totalRounds,
      currentWord: gameState.word || state.currentWord,
      timeRemaining: gameState.time_remaining || state.timeRemaining,
      currentDrawer: gameState.current_drawer_id || state.currentDrawer,
      isDrawing: gameState.is_drawer || false,
    }));
  },

  setRoundInfo: (roundInfo) => {
    set({
      currentRound: roundInfo.round,
      totalRounds: roundInfo.totalRounds,
      timeRemaining: roundInfo.timeRemaining,
      currentWord: roundInfo.word || '',
      currentDrawer: roundInfo.drawer,
      isDrawing: roundInfo.isDrawing || false,
    });
  },

  updateTimeRemaining: (time) => {
    set({ timeRemaining: time });
  },

  addDrawingData: (data) => {
    set((state) => ({
      drawingData: [...state.drawingData, data],
    }));
  },

  clearDrawing: () => {
    set({ drawingData: [] });
  },

  sendClearCanvas: () => {
    const { isSocketConnected } = get();
    if (isSocketConnected) {
      socketManager.sendClearCanvas();
    } else {
      console.error('Cannot clear canvas: Socket not connected');
    }
  },

  setBrushColor: (color) => {
    set({ brushColor: color });
  },

  setBrushSize: (size) => {
    set({ brushSize: size });
  },

  setDrawingMode: (mode) => {
    set({ isDrawingMode: mode });
  },

  addChatMessage: (message) => {
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    }));
  },

  addChatMessageFromSocket: (messageData) => {
    // Format the message data to match the expected structure
    const formattedMessage = {
      username: messageData.username || 'Unknown',
      message: messageData.message || '',
      timestamp: (messageData.timestamp || Date.now() / 1000) * 1000, // Convert to milliseconds for JavaScript Date
      isCorrectGuess: false,
      isSystemMessage: false,
    };
    
    set((state) => ({
      chatMessages: [...state.chatMessages, formattedMessage],
    }));
  },

  addCorrectGuessMessage: (messageData) => {
    // Format correct guess message
    const formattedMessage = {
      username: messageData.username || 'Unknown',
      message: messageData.message || 'Guessed correctly!',
      timestamp: Date.now(),
      isCorrectGuess: true,
      isSystemMessage: true,
    };
    
    set((state) => ({
      chatMessages: [...state.chatMessages, formattedMessage],
    }));
  },

  setGuessInput: (input) => {
    set({ guessInput: input });
  },

  sendGuess: () => {
    const { guessInput, isSocketConnected } = get();
    if (guessInput.trim() && isSocketConnected) {
      socketManager.sendGuess(guessInput.trim());
      set({ guessInput: '' });
    } else if (!isSocketConnected) {
      console.error('Cannot send guess: Socket not connected');
    }
  },

  sendChatMessage: (message) => {
    const { isSocketConnected } = get();
    if (isSocketConnected) {
      socketManager.sendChatMessage(message);
    } else {
      console.error('Cannot send chat message: Socket not connected');
    }
  },

  sendDrawData: (drawData) => {
    const { isSocketConnected } = get();
    if (isSocketConnected) {
      // Add timestamp to drawing data
      const dataWithTimestamp = {
        ...drawData,
        timestamp: Date.now()
      };
      socketManager.sendDrawData(
        dataWithTimestamp.x,
        dataWithTimestamp.y,
        dataWithTimestamp.is_drawing,
        dataWithTimestamp.color,
        dataWithTimestamp.brush_size,
        dataWithTimestamp.is_first_point || false
      );
    } else {
      console.error('Cannot send draw data: Socket not connected');
    }
  },

  startGame: () => {
    const { isSocketConnected } = get();
    if (isSocketConnected) {
      socketManager.startGame();
    } else {
      console.error('Cannot start game: Socket not connected');
    }
  },

  setReady: (ready) => {
    const { isSocketConnected } = get();
    if (isSocketConnected) {
      socketManager.setReady(ready);
    } else {
      console.error('Cannot set ready status: Socket not connected');
    }
  },

  skipTurn: () => {
    const { isSocketConnected } = get();
    if (isSocketConnected) {
      socketManager.skipTurn();
    } else {
      console.error('Cannot skip turn: Socket not connected');
    }
  },

  resetGameState: () => {
    set({
      gameState: null,
      isGameActive: false,
      currentRound: 0,
      timeRemaining: 0,
      currentWord: '',
      isDrawing: false,
      currentDrawer: null,
      drawingData: [],
      chatMessages: [],
    });
  },

  showRoundEndPopup: (roundData) => {
    set({
      showRoundEndPopup: true,
      roundEndData: roundData,
    });
  },

  hideRoundEndPopup: () => {
    set({
      showRoundEndPopup: false,
      roundEndData: null,
    });
  },

  showGameEndPopup: (gameData) => {
    set({
      showGameEndPopup: true,
      gameEndData: gameData,
    });
  },

  hideGameEndPopup: () => {
    set({
      showGameEndPopup: false,
      gameEndData: null,
    });
  },

  // Socket event handlers
  handleSocketConnected: (data) => {
    set({ isSocketConnected: data.connected });
  },

  handleAuthenticated: (data) => {
    console.log('Authenticated:', data);
  },

  handleRoomJoined: (data) => {
    set({
      currentRoom: { id: data.room_id },
      players: data.players || [],
      isInRoom: true,
    });
  },

  handlePlayerJoined: (data) => {
    set((state) => {
      // Check if player already exists
      const existingPlayer = state.players.find(p => p.id === data.user_id);
      if (existingPlayer) {
        return state; // Player already exists, don't add duplicate
      }
      
      return {
        players: [...state.players, {
          id: data.user_id,
          username: data.username,
          score: 0,
          ready: false,
        }],
      };
    });
  },

  handlePlayerLeft: (data) => {
    set((state) => ({
      players: state.players.filter((p) => p.id !== data.user_id),
    }));
  },

  handleGameStarted: (data) => {
    set({ isGameActive: true });
  },

  handleRoundStarted: (data) => {
    set({
      currentRound: data.round,
      timeRemaining: data.time_remaining,
      drawingData: [], // Clear drawing data for new round
      guessedPlayers: [], // Reset guessed players for new round
      guessProgress: { guessed: 0, total: 0 }, // Reset guess progress
    });
    console.log('Round started:', data);
  },

  handleWordAssigned: (data) => {
    set({
      currentWord: data.word,
    });
  },

  handleCorrectGuess: (data) => {
    // Add correct guess message to chat
    get().addCorrectGuessMessage(data);
    
    // Update guess progress
    set((state) => {
      const newGuessedPlayers = [...state.guessedPlayers, data.user_id];
      const nonDrawerPlayers = state.players.filter(p => p.id !== state.currentDrawer);
      const totalNonDrawers = nonDrawerPlayers.length;
      const guessedCount = newGuessedPlayers.length;
      
      return {
        guessedPlayers: newGuessedPlayers,
        guessProgress: {
          guessed: guessedCount,
          total: totalNonDrawers
        }
      };
    });
  },

  handleAllGuessed: (data) => {
    // Add system message about all players guessing
    const systemMessage = {
      username: 'System',
      message: data.message || 'Everyone guessed correctly!',
      timestamp: Date.now(),
      isCorrectGuess: false,
      isSystemMessage: true,
    };
    
    set((state) => ({
      chatMessages: [...state.chatMessages, systemMessage],
    }));
  },

  handleRoundEnded: (data) => {
    set((state) => {
      // Show round end popup only if it's the final round
      const isFinalRound = data.round >= state.totalRounds;
      
      if (isFinalRound) {
        const roundData = {
          roundNumber: data.round,
          word: data.word,
          players: state.players,
        };
        
        return {
          currentWord: '',
          drawingData: [],
          showRoundEndPopup: true,
          roundEndData: roundData,
        };
      } else {
        // Just update state without showing popup for non-final rounds
        return {
          currentWord: '',
          drawingData: [],
        };
      }
    });
  },

  handleGameEnded: (data) => {
    set((state) => {
      // Show game end popup with final scores
      const gameData = {
        finalScores: data.final_scores || {},
        players: state.players,
      };
      
      return {
        isGameActive: false,
        currentRound: 0,
        timeRemaining: 0,
        currentWord: '',
        drawingData: [],
        showGameEndPopup: true,
        gameEndData: gameData,
      };
    });
  },

  handleTimeUpdate: (data) => {
    set({ timeRemaining: data.time_remaining });
    console.log('Time update:', data.time_remaining);
  },

  handleCanvasCleared: (data) => {
    set({ drawingData: [] });
  },

  handleRoomDeleted: (data) => {
    set({
      currentRoom: null,
      players: [],
      isInRoom: false,
      gameState: null,
      isGameActive: false,
      chatMessages: [],
      drawingData: [],
    });
  },

  handlePlayersUpdate: (data) => {
    set({ players: data.players || [] });
  },

  // Handle incoming drawing data from other players
  handleDrawData: (data) => {
    if (data && data.data) {
      // Add the received drawing data to the store
      set((state) => ({
        drawingData: [...state.drawingData, data.data],
      }));
    }
  },

  // Handle incoming game state updates
  handleGameState: (data) => {
    set((state) => ({
      gameState: { ...state.gameState, ...data },
      isGameActive: data.game_started !== undefined ? data.game_started : state.isGameActive,
      currentRound: data.current_round || state.currentRound,
      totalRounds: data.max_rounds || state.totalRounds,
      currentWord: data.word || state.currentWord,
      timeRemaining: data.time_remaining || state.timeRemaining,
      currentDrawer: data.current_drawer_id || state.currentDrawer,
      isDrawing: data.is_drawer || false,
    }));
    console.log('Game state update:', data);
  },
}));

export default useGameStore; 