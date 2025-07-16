#!/usr/bin/env python3
"""
Simple test script to verify backend functionality
"""

import requests
import json
import time

# Base URL for the API
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test the health check endpoint"""
    print("Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running on localhost:8000")
        return False

def test_user_registration():
    """Test user registration"""
    print("\nTesting user registration...")
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        if response.status_code == 200:
            print("✅ User registration successful")
            return response.json()
        else:
            print(f"❌ User registration failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error during registration: {e}")
        return None

def test_user_login():
    """Test user login"""
    print("\nTesting user login...")
    login_data = {
        "username": "testuser",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            print("✅ User login successful")
            return response.json()
        else:
            print(f"❌ User login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error during login: {e}")
        return None

def test_create_room(token):
    """Test room creation"""
    print("\nTesting room creation...")
    room_data = {
        "name": "Test Room",
        "is_private": False,
        "max_players": 8,
        "time_limit": 60,
        "max_rounds": 5
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{BASE_URL}/rooms/", json=room_data, headers=headers)
        if response.status_code == 200:
            print("✅ Room creation successful")
            return response.json()
        else:
            print(f"❌ Room creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error during room creation: {e}")
        return None

def test_get_public_rooms():
    """Test getting public rooms"""
    print("\nTesting get public rooms...")
    
    try:
        response = requests.get(f"{BASE_URL}/rooms/")
        if response.status_code == 200:
            rooms = response.json()
            print(f"✅ Found {len(rooms)} public rooms")
            return rooms
        else:
            print(f"❌ Get public rooms failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting public rooms: {e}")
        return None

def test_leaderboard():
    """Test leaderboard endpoint"""
    print("\nTesting leaderboard...")
    
    try:
        response = requests.get(f"{BASE_URL}/users/leaderboard")
        if response.status_code == 200:
            leaderboard = response.json()
            print(f"✅ Leaderboard retrieved with {len(leaderboard)} entries")
            return leaderboard
        else:
            print(f"❌ Leaderboard failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting leaderboard: {e}")
        return None

def main():
    """Run all tests"""
    print("🚀 Starting DrawSync Backend Tests")
    print("=" * 50)
    
    # Test health check
    if not test_health_check():
        print("\n❌ Backend is not running. Please start the server first.")
        return
    
    # Test user registration
    user = test_user_registration()
    
    # Test user login
    login_result = test_user_login()
    if not login_result:
        print("\n❌ Login failed. Cannot continue with other tests.")
        return
    
    token = login_result.get('access_token')
    
    # Test room creation
    room = test_create_room(token)
    
    # Test get public rooms
    rooms = test_get_public_rooms()
    
    # Test leaderboard
    leaderboard = test_leaderboard()
    
    print("\n" + "=" * 50)
    print("🎉 Backend tests completed!")
    print("\nNext steps:")
    print("1. Start the socket server: python -m app.socket_server")
    print("2. Test real-time features with a WebSocket client")
    print("3. Build the frontend to connect to this backend")

if __name__ == "__main__":
    main() 