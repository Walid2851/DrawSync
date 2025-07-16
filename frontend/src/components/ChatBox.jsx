import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Wifi, WifiOff, Target, Clock, Users, Sparkles, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
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
    guessProgress,
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
    <div className="chat-container">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Chat</h3>
            <div className="flex items-center space-x-2">
              {isSocketConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {isGameActive && (
          <div className="flex items-center space-x-4 text-sm">
            <div className="glass-card px-3 py-1 rounded-lg">
              <div className="flex items-center space-x-1">
                <Target className="w-3 h-3 text-slate-600" />
                <span className="font-semibold text-slate-700">Round {currentRound}/{totalRounds}</span>
              </div>
            </div>
            <div className="glass-card px-3 py-1 rounded-lg">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-600" />
                <span className="font-semibold text-slate-700">{formatTimeRemaining(timeRemaining)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      {!isSocketConnected && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4"
        >
          <div className="flex items-center">
            <WifiOff className="w-4 h-4 text-amber-500 mr-3" />
            <p className="text-sm font-medium text-amber-700">
              Connecting to chat server...
            </p>
          </div>
        </motion.div>
      )}

      {/* Game Status */}
      {isGameActive && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="w-4 h-4 text-blue-500 mr-3" />
              <p className="text-sm font-medium text-blue-700">
                {isCurrentDrawer ? 
                  '🎨 You are drawing! Others are guessing.' : 
                  '👀 Someone is drawing. Type your guess below!'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {!isCurrentDrawer && guessProgress.total > 0 && (
                <div className="bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 rounded-full text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <Users className="w-3 h-3 inline mr-1" />
                  {guessProgress.guessed}/{guessProgress.total} guessed
                </div>
              )}
              {isCurrentDrawer && currentWord && (
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 border border-blue-200">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Word: {currentWord}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No messages yet</p>
            <p className="text-slate-400 text-sm mt-1">Start the conversation!</p>
          </motion.div>
        ) : (
          messages.map((msg, index) => (
            <motion.div 
              key={index} 
              className="flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {(msg.username || 'Unknown').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-semibold text-sm text-slate-700">
                  {msg.username || 'Unknown'}
                </span>
                <span className="text-xs text-slate-400">
                  {formatTime(msg.timestamp || Date.now())}
                </span>
                {msg.isCorrectGuess && (
                  <div className="flex items-center space-x-1 bg-gradient-to-r from-emerald-100 to-teal-100 px-2 py-1 rounded-full">
                    <Crown className="w-3 h-3 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">Correct!</span>
                  </div>
                )}
              </div>
              <div className={`rounded-xl px-4 py-3 max-w-xs shadow-sm ${
                msg.isCorrectGuess 
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200' 
                  : msg.isSystemMessage 
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200' 
                    : 'bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200'
              }`}>
                <p className="text-sm text-slate-800 font-medium">{msg.message || ''}</p>
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-container">
        {shouldShowGuessInput ? (
          // Guess input during game for non-drawers
          <form onSubmit={handleSendGuess} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => onGuessInputChange && onGuessInputChange(e.target.value)}
                placeholder={isSocketConnected ? "🎯 Type your guess..." : "Connecting..."}
                className="input text-sm w-full pr-16"
                maxLength={50}
                disabled={!isSocketConnected}
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400 font-medium">
                {guessInput.length}/50
              </div>
            </div>
            <Button 
              type="submit" 
              size="sm"
              disabled={!isSocketConnected || !guessInput.trim()}
              className="w-full"
            >
              <Target className="w-4 h-4 mr-2" />
              Submit Guess
            </Button>
          </form>
        ) : (
          // Regular chat input
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isSocketConnected ? "💬 Type a message..." : "Connecting..."}
              className="input flex-1 text-sm"
              maxLength={200}
              disabled={!isSocketConnected}
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={!isSocketConnected || !message.trim()}
              className="px-4"
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