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

  setRoomData: (roomData) => {
    set({ currentRoom: roomData });
  },

  setPlayers: (players) => {
    set({ players });
  },

  addPlayer: (player) => {
    set((state) => ({
      players: [...state.players, player],
    }));
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
      currentWord: gameState.current_word || state.currentWord,
      timeRemaining: gameState.time_remaining || state.timeRemaining,
      currentDrawer: gameState.current_drawer_id || state.currentDrawer,
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
        dataWithTimestamp.is_drawing, // Use the correct property name
        dataWithTimestamp.color,
        dataWithTimestamp.brush_size, // Use the correct property name
        dataWithTimestamp.is_first_point || false
      );
    } else {
      console.error('Cannot send draw data: Socket not connected');
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

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  resetGame: () => {
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
      guessInput: '',
      isDrawingMode: false,
    });
  },

  // New methods for enhanced functionality
  handleGameStarted: (gameData) => {
    set({
      isGameActive: true,
      gameState: gameData.game_state,
      currentRound: gameData.game_state.current_round,
      totalRounds: gameData.game_state.max_rounds,
      timeRemaining: gameData.game_state.time_remaining,
      currentWord: gameData.game_state.current_word,
      currentDrawer: gameData.game_state.current_drawer_id,
      drawingData: [],
      chatMessages: [],
    });
  },

  handleRoundStarted: (roundData) => {
    set({
      currentRound: roundData.round,
      currentWord: roundData.word,
      currentDrawer: roundData.drawer_id,
      timeRemaining: roundData.time_limit,
      drawingData: [],
    });
  },

  handleCorrectGuess: (guessData) => {
    const { chatMessages } = get();
    const newMessage = {
      username: guessData.username,
      message: `${guessData.username} guessed correctly!`,
      timestamp: Date.now(),
      isCorrectGuess: true,
      isSystemMessage: true,
    };
    set({ chatMessages: [...chatMessages, newMessage] });
  },

  handleRoundEnded: (roundData) => {
    set({
      isDrawing: false,
      currentWord: '',
      timeRemaining: 0,
    });
  },

  handleGameEnded: (gameData) => {
    set({
      isGameActive: false,
      gameState: null,
      currentRound: 0,
      timeRemaining: 0,
      currentWord: '',
      isDrawing: false,
      currentDrawer: null,
      drawingData: [],
    });
  },
}));

export default useGameStore; 