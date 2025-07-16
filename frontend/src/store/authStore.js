import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login user
      login: async (credentials) => {
        console.log('AuthStore: Starting login process');
        set({ isLoading: true, error: null });
        try {
          console.log('AuthStore: Making login API call');
          const response = await authAPI.login(credentials);
          console.log('AuthStore: Login API response:', response.data);
          const { access_token } = response.data;
          
          // Store token in localStorage first
          localStorage.setItem('token', access_token);
          console.log('AuthStore: Token stored in localStorage');
          
          // Get user info using the token
          console.log('AuthStore: Getting current user info');
          const userResponse = await authAPI.getCurrentUser();
          console.log('AuthStore: User info response:', userResponse.data);
          const user = userResponse.data;
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          console.log('AuthStore: State updated successfully');

          // Store user in localStorage
          localStorage.setItem('user', JSON.stringify(user));
          console.log('AuthStore: User stored in localStorage');
          
          return { success: true };
        } catch (error) {
          console.error('AuthStore: Login error:', error);
          const errorMessage = error.response?.data?.detail || 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }
      },

      // Register user
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register(userData);
          const user = response.data;
          
          // For registration, we need to login to get the token
          const loginResponse = await authAPI.login({
            username: userData.username,
            password: userData.password
          });
          const { access_token } = loginResponse.data;
          
          // Store token in localStorage first
          localStorage.setItem('token', access_token);
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Store user in localStorage
          localStorage.setItem('user', JSON.stringify(user));
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.detail || 'Registration failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }
      },

      // Logout user
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      // Initialize auth state from localStorage
      initializeAuth: async () => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
          try {
            const userData = JSON.parse(user);
            set({
              user: userData,
              token,
              isAuthenticated: true,
            });

            // Verify token is still valid
            await authAPI.getCurrentUser();
          } catch (error) {
            // Token is invalid, clear auth state
            get().logout();
          }
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Update user data
      updateUser: (userData) => {
        set({ user: userData });
        localStorage.setItem('user', JSON.stringify(userData));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore; 