import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Users, 
  Gamepad2, 
  Settings, 
  LogOut, 
  Copy,
  Search,
  RefreshCw,
  Sparkles,
  Palette,
  Clock,
  Crown
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useGameStore from '../store/gameStore';
import { roomsAPI } from '../utils/api';
import Button from '../components/Button';
import Input from '../components/Input';

const Dashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [createRoomData, setCreateRoomData] = useState({
    name: '',
    max_players: 8,
    is_private: false,
  });

  const { user, logout } = useAuthStore();
  const { joinRoom } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const response = await roomsAPI.getPublicRooms();
      setRooms(response.data);
    } catch (error) {
      toast.error('Failed to fetch rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    if (!createRoomData.name.trim()) {
      toast.error('Room name is required');
      return;
    }

    try {
      const response = await roomsAPI.createRoom(createRoomData);
      const room = response.data;
      
      toast.success('Room created successfully!');
      setShowCreateRoom(false);
      setCreateRoomData({ name: '', max_players: 8, is_private: false });
      
      // Join the room
      joinRoom(room.id);
      navigate(`/room/${room.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create room');
    }
  };

  const handleJoinRoom = async (room) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token before join:', token);
      await roomsAPI.joinRoom({ room_code: room.room_code });
      joinRoom(room.id);
      navigate(`/room/${room.id}`);
    } catch (error) {
      const detail = error.response?.data?.detail || '';
      // If already in room, still navigate
      if (detail && detail.toLowerCase().includes('already')) {
        joinRoom(room.id);
        navigate(`/room/${room.id}`);
        toast.success('You are already in this room!');
      } else {
        console.error('Join room error:', error.response?.data || error.message);
        toast.error(detail || 'Failed to join room');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const copyRoomCode = (roomCode) => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Room code copied to clipboard!');
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.room_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="glass-card border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Gamepad2 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">DrawSync</h1>
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center space-x-3 glass-card px-4 py-2 rounded-xl">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-slate-700 font-medium">{user?.username}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.h2 
            className="text-4xl font-bold text-slate-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Welcome back, <span className="gradient-text">{user?.username}</span>! 👋
          </motion.h2>
          <motion.p 
            className="text-slate-600 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Ready to create some amazing drawings with friends? Create a new room or join an existing one to start your artistic journey!
          </motion.p>

          {/* Feature Highlights */}
          <motion.div 
            className="flex items-center justify-center space-x-8 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center space-x-2 text-slate-600">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Multiplayer</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-600">
              <Palette className="w-5 h-5" />
              <span className="text-sm font-medium">Real-time Drawing</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-600">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">Instant Sync</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Actions */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={() => setShowCreateRoom(true)}
            className="flex items-center space-x-2 btn-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Room</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={fetchRooms}
            loading={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Refresh Rooms</span>
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search rooms by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12"
            />
          </div>
        </motion.div>

        {/* Rooms Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {filteredRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="room-card"
              onClick={() => handleJoinRoom(room)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-900 truncate">
                  {room.name}
                </h3>
                <div className="flex items-center space-x-2 glass-card px-3 py-1 rounded-lg">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-700">
                    {room.current_players}/{room.max_players}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Room Code:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold text-slate-800">
                      {room.room_code}
                    </code>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyRoomCode(room.room_code);
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Status:</span>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${
                    room.is_active 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {room.is_active ? '🟢 Active' : '⚪ Inactive'}
                  </span>
                </div>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinRoom(room);
                }}
                disabled={room.current_players >= room.max_players || !room.is_active}
                className="w-full"
                variant={room.current_players >= room.max_players || !room.is_active ? "secondary" : "primary"}
              >
                {room.current_players >= room.max_players 
                  ? '🚫 Room Full' 
                  : !room.is_active 
                    ? '⏸️ Room Inactive' 
                    : '🎨 Join Room'
                }
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {filteredRooms.length === 0 && !isLoading && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              No rooms found
            </h3>
            <p className="text-slate-600 text-lg max-w-md mx-auto">
              {searchTerm ? 'Try adjusting your search terms' : 'Be the first to create a room and start drawing with friends!'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowCreateRoom(true)}
                className="mt-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Room
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <motion.div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="card p-8 w-full max-w-md"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Create New Room
              </h3>
              <p className="text-slate-600">
                Set up your drawing space and invite friends to join
              </p>
            </div>
            
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <Input
                label="Room Name"
                value={createRoomData.name}
                onChange={(e) => setCreateRoomData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Enter a creative room name"
                required
              />
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Max Players
                </label>
                <select
                  value={createRoomData.max_players}
                  onChange={(e) => setCreateRoomData(prev => ({
                    ...prev,
                    max_players: parseInt(e.target.value)
                  }))}
                  className="input"
                >
                  <option value={2}>2 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={6}>6 Players</option>
                  <option value={8}>8 Players</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl">
                <input
                  type="checkbox"
                  id="private"
                  checked={createRoomData.is_private}
                  onChange={(e) => setCreateRoomData(prev => ({
                    ...prev,
                    is_private: e.target.checked
                  }))}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="private" className="text-sm text-slate-700 font-medium">
                  Make this room private (invite-only)
                </label>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1 btn-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Room
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateRoom(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard; 