import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('API Interceptor: Request to', config.url, 'Token:', token ? 'Present' : 'Not present');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Interceptor: Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('API Interceptor: Response from', response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('API Interceptor: Response error from', error.config?.url, 'Status:', error.response?.status, 'Error:', error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => {
    console.log('API: Registering user:', userData);
    return api.post('/auth/register', userData);
  },
  login: (credentials) => {
    console.log('API: Logging in with credentials:', credentials);
    return api.post('/auth/login', credentials);
  },
  getCurrentUser: () => {
    console.log('API: Getting current user');
    return api.get('/auth/me');
  },
};

// Rooms API
export const roomsAPI = {
  createRoom: (roomData) => api.post('/rooms/', roomData),
  joinRoom: (roomData) => api.post('/rooms/join', roomData),
  leaveRoom: (roomId) => api.post(`/rooms/${roomId}/leave`),
  getPublicRooms: () => api.get('/rooms/'),
  getRoomByCode: (roomCode) => api.get(`/rooms/${roomCode}`),
  getRoomPlayers: (roomId) => api.get(`/rooms/${roomId}/players`),
};

// Games API
export const gamesAPI = {
  startGame: (roomId) => api.post(`/games/${roomId}/start`),
  getGameState: (roomId) => api.get(`/games/${roomId}/state`),
  submitDrawing: (roomId, drawingData) => api.post(`/games/${roomId}/draw`, drawingData),
  submitGuess: (roomId, guessData) => api.post(`/games/${roomId}/guess`, guessData),
  getPublicRooms: () => api.get('/games/rooms/public'),
};

// Users API
export const usersAPI = {
  getUserStats: () => api.get('/users/stats'),
  getLeaderboard: () => api.get('/users/leaderboard'),
};

export default api; 