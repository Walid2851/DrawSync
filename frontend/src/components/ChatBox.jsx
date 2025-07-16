import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Wifi, WifiOff, Target, Clock, Users } from 'lucide-react';
import useGameStore from '../store/gameStore';
import useAuthStore from '../store/authStore';
import Button from './Button';

const ChatBox = ({ 
  messages = [], 
  onSendMessage, 
  guessInput = '', 
  onGuessInputChange, 
  onSendGuess, 
  isGameActive = false 
}) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  const { user } = useAuthStore();
  const {
    isSocketConnected,
    gameState,
    timeRemaining,
    currentRound,
    totalRounds,
    currentWord,
  } = useGameStore();

  // Check if current user is the drawer
  const isCurrentDrawer = gameState?.current_drawer_id === user?.id || false;
  const shouldShowGuessInput = isGameActive && !isCurrentDrawer;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && isSocketConnected && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
    } else if (!isSocketConnected) {
      console.error('Cannot send message: Socket not connected');
    }
  };

  const handleSendGuess = (e) => {
    e.preventDefault();
    if (guessInput.trim() && isSocketConnected && onSendGuess) {
      onSendGuess();
    } else if (!isSocketConnected) {
      console.error('Cannot send guess: Socket not connected');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card h-96 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Chat</h3>
          {isSocketConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </div>
        {isGameActive && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>Round {currentRound}/{totalRounds}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatTimeRemaining(timeRemaining)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      {!isSocketConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
          <div className="flex items-center">
            <WifiOff className="w-4 h-4 text-yellow-400 mr-2" />
            <p className="text-sm text-yellow-700">
              Connecting to chat server...
            </p>
          </div>
        </div>
      )}

      {/* Game Status */}
      {isGameActive && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="w-4 h-4 text-blue-400 mr-2" />
              <p className="text-sm text-blue-700">
                {isCurrentDrawer ? 
                  'You are drawing! Others are guessing.' : 
                  'Someone is drawing. Type your guess below!'
                }
              </p>
            </div>
            {isCurrentDrawer && currentWord && (
              <div className="bg-blue-100 px-2 py-1 rounded text-xs font-medium">
                Word: {currentWord}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="flex flex-col">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-sm text-primary-600">
                  {msg.username || 'Unknown'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(msg.timestamp || Date.now())}
                </span>
                {msg.isCorrectGuess && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Correct!
                  </span>
                )}
              </div>
              <div className={`rounded-lg px-3 py-2 max-w-xs ${
                msg.isCorrectGuess 
                  ? 'bg-green-100 border border-green-200' 
                  : msg.isSystemMessage 
                    ? 'bg-yellow-100 border border-yellow-200' 
                    : 'bg-gray-100'
              }`}>
                <p className="text-sm text-gray-900">{msg.message || ''}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        {shouldShowGuessInput ? (
          // Guess input during game for non-drawers
          <form onSubmit={handleSendGuess} className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => onGuessInputChange && onGuessInputChange(e.target.value)}
                placeholder={isSocketConnected ? "Type your guess..." : "Connecting..."}
                className="input text-sm w-full pr-8"
                maxLength={50}
                disabled={!isSocketConnected}
                autoComplete="off"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                {guessInput.length}/50
              </div>
            </div>
            <Button 
              type="submit" 
              size="sm" 
              disabled={!guessInput.trim() || !isSocketConnected}
              className="bg-green-500 hover:bg-green-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          // Regular chat input
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  !isSocketConnected ? "Connecting..." :
                  isGameActive && isCurrentDrawer ? "You can't chat while drawing..." :
                  "Type a message..."
                }
                className="input text-sm w-full pr-8"
                maxLength={200}
                disabled={!isSocketConnected || (isGameActive && isCurrentDrawer)}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                {message.length}/200
              </div>
            </div>
            <Button 
              type="submit" 
              size="sm" 
              disabled={!message.trim() || !isSocketConnected || (isGameActive && isCurrentDrawer)}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatBox; 