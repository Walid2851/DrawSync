class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
    this.connectionAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
    this.reconnectTimer = null;
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      return;
    }

    console.log('Connecting to socket server...');
    
    try {
      // Create WebSocket connection to our WebSocket bridge
      this.socket = new WebSocket('ws://localhost:8002');
      
      this.socket.onopen = () => {
        console.log('✅ Connected to socket server');
        this.isConnected = true;
        this.connectionAttempts = 0;
        
        // Notify store about connection
        this.emit('socket_connected', { connected: true });
        
        // Authenticate after connection
        if (token) {
          console.log('Authenticating with token...');
          this.sendMessage({
            type: 'authenticate',
            token: token
          });
        } else {
          console.log('No token provided for authentication');
        }
      };

      this.socket.onclose = (event) => {
        console.log('❌ Disconnected from socket server:', event.code, event.reason);
        this.isConnected = false;
        
        // Notify store about disconnection
        this.emit('socket_connected', { connected: false });
        
        // Attempt to reconnect
        if (this.connectionAttempts < this.maxReconnectAttempts) {
          this.connectionAttempts++;
          console.log(`Attempting to reconnect (${this.connectionAttempts}/${this.maxReconnectAttempts})...`);
          
          this.reconnectTimer = setTimeout(() => {
            this.connect(token);
          }, this.reconnectDelay * this.connectionAttempts);
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ Socket error:', error);
        this.isConnected = false;
        this.emit('socket_connected', { connected: false });
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.isConnected = false;
      this.emit('socket_connected', { connected: false });
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.connectionAttempts = 0;
    console.log('🔌 Disconnected from socket server');
  }

  sendMessage(message) {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Socket not connected, queuing message:', message);
      this.messageQueue.push(message);
      return;
    }

    try {
      const messageStr = JSON.stringify(message) + '\n';
      this.socket.send(messageStr);
      console.log('📤 Sent message:', message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }

  handleMessage(message) {
    const messageType = message.type;
    
    // Emit the message to all listeners
    this.emit(messageType, message);
    
    // Handle specific message types
    switch (messageType) {
      case 'authenticated':
        console.log('✅ Authentication successful:', message);
        break;
      case 'error':
        console.error('❌ Server error:', message.message);
        break;
      case 'room_joined':
        console.log('✅ Joined room:', message);
        break;
      case 'player_joined':
        console.log('👤 Player joined:', message);
        break;
      case 'player_left':
        console.log('👤 Player left:', message);
        break;
      case 'player_disconnected':
        console.log('👤 Player disconnected:', message);
        break;
      case 'draw_data':
        console.log('🎨 Received draw data:', message);
        break;
      case 'chat_message':
        console.log('💬 Received chat message:', message);
        break;
      case 'guess_result':
        console.log('🎯 Guess result:', message);
        break;
      case 'word_guessed':
        console.log('🎉 Word guessed:', message);
        break;
      case 'correct_guess':
        console.log('🎉 Correct guess:', message);
        break;
      case 'player_ready':
        console.log('✅ Player ready:', message);
        break;
      case 'game_started':
        console.log('🎮 Game started:', message);
        break;
      case 'round_started':
        console.log('🔄 Round started:', message);
        break;
      case 'round_ended':
        console.log('⏹️ Round ended:', message);
        break;
      case 'game_ended':
        console.log('🏁 Game ended:', message);
        break;
      case 'game_state':
        console.log('🎮 Game state update:', message);
        break;
      case 'time_update':
        console.log('⏰ Time update:', message);
        break;
      case 'drawer_changed':
        console.log('👨‍🎨 Drawer changed:', message);
        break;
      case 'word_assigned':
        console.log('📝 Word assigned:', message);
        break;
      case 'canvas_cleared':
        console.log('🧹 Canvas cleared:', message);
        break;
      default:
        console.log('📨 Unknown message type:', messageType, message);
    }
  }

  // Room management
  joinRoom(roomId) {
    this.sendMessage({
      type: 'join_room',
      room_id: roomId
    });
  }

  leaveRoom() {
    this.sendMessage({
      type: 'leave_room'
    });
  }

  // Drawing
  sendDrawData(x, y, isDrawing, color = '#000000', brushSize = 2, isFirstPoint = false) {
    this.sendMessage({
      type: 'draw',
      x: x,
      y: y,
      is_drawing: isDrawing,
      is_first_point: isFirstPoint,
      color: color,
      brush_size: brushSize,
      timestamp: Date.now()
    });
  }

  // Clear canvas
  sendClearCanvas() {
    this.sendMessage({
      type: 'clear_canvas'
    });
  }

  // Chat and guessing
  sendChatMessage(message) {
    this.sendMessage({
      type: 'chat_message',
      message: message
    });
  }

  sendGuess(guess) {
    this.sendMessage({
      type: 'guess_word',
      guess: guess
    });
  }

  // Game control
  startGame() {
    this.sendMessage({
      type: 'start_game'
    });
  }

  setReady(ready) {
    this.sendMessage({
      type: 'ready',
      ready: ready
    });
  }

  skipTurn() {
    this.sendMessage({
      type: 'skip_turn'
    });
  }

  clearCanvas() {
    this.sendMessage({
      type: 'clear_canvas'
    });
  }

  // Event handling
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      // Create a copy of the listeners array to avoid modification during iteration
      const listeners = [...this.eventListeners.get(event)];
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected() {
    return this.isConnected;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      attempts: this.connectionAttempts,
      maxAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager; 