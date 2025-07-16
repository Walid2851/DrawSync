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
  RefreshCw
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Gamepad2 className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">DrawSync</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700 font-medium">{user?.username}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-gray-600">
            Create a new room or join an existing one to start drawing with friends
          </p>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            onClick={() => setShowCreateRoom(true)}
            className="flex items-center space-x-2"
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
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search rooms by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {room.name}
                </h3>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {room.current_players}/{room.max_players}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Room Code:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {room.room_code}
                    </code>
                    <button
                      onClick={() => copyRoomCode(room.room_code)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    room.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {room.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => handleJoinRoom(room)}
                disabled={room.current_players >= room.max_players || !room.is_active}
                className="w-full"
              >
                {room.current_players >= room.max_players 
                  ? 'Room Full' 
                  : !room.is_active 
                    ? 'Room Inactive' 
                    : 'Join Room'
                }
              </Button>
            </motion.div>
          ))}
        </div>

        {filteredRooms.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No rooms found
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : 'Create the first room to get started!'}
            </p>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Room
            </h3>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <Input
                label="Room Name"
                value={createRoomData.name}
                onChange={(e) => setCreateRoomData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Enter room name"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="private"
                  checked={createRoomData.is_private}
                  onChange={(e) => setCreateRoomData(prev => ({
                    ...prev,
                    is_private: e.target.checked
                  }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="private" className="ml-2 text-sm text-gray-700">
                  Private Room
                </label>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  className="flex-1"
                >
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
        </div>
      )}
    </div>
  );
};

export default Dashboard; 