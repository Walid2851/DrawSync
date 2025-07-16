# DrawSync Game Flow Test Plan

## Prerequisites
1. Backend server running on port 8000
2. Socket server running on port 8001
3. Frontend running on port 3000
4. At least 2 browser windows/tabs ready for testing

## Test Setup

### 1. Start All Services
```bash
# Terminal 1: Backend API
cd backend
source venv/bin/activate
python run.py

# Terminal 2: Socket Server
cd backend
source venv/bin/activate
python start_socket_server.py

# Terminal 3: Frontend
cd frontend
npm start
```

### 2. Create Test Users
1. Open browser and go to `http://localhost:3000`
2. Register 2-3 test users:
   - User 1: `player1` / `password123`
   - User 2: `player2` / `password123`
   - User 3: `player3` / `password123`

## Test Scenarios

### Scenario 1: Basic Game Flow (2 Players)

#### Step 1: Create and Join Room
1. **Player 1**: Login and create a room
   - Click "Create Room"
   - Set room name: "Test Game"
   - Set max players: 4
   - Set time limit: 60 seconds
   - Set max rounds: 3
   - Click "Create Room"
   - Copy the room code

2. **Player 2**: Login and join the room
   - Click "Join Room"
   - Enter the room code from Player 1
   - Click "Join Room"

#### Step 2: Pre-Game Setup
1. **Both Players**: Verify room information
   - Room name displays correctly
   - Player list shows both players
   - Chat is functional
   - Ready button is available

2. **Both Players**: Set ready status
   - Click "Not Ready" to toggle to "Ready"
   - Verify ready status updates in real-time
   - Verify "Start Game" button becomes enabled

#### Step 3: Start Game
1. **Player 1**: Start the game
   - Click "Start Game"
   - Verify game starts successfully
   - Verify toast notification appears

2. **Both Players**: Verify game state
   - Round 1 of 3 displays
   - Timer starts counting down
   - Current drawer is assigned
   - Word is shown to drawer, blanks to others
   - Scores initialize to 0

#### Step 4: Drawing and Guessing
1. **Current Drawer**: Draw the word
   - Verify drawing tools are available
   - Test color selection
   - Test brush size selection
   - Draw something related to the word
   - Verify drawing appears in real-time for other player

2. **Other Player**: Guess the word
   - Type guess in chat input
   - Submit guess
   - Verify correct guess notification
   - Verify scores update
   - Verify round ends and next round starts

#### Step 5: Round Progression
1. **Verify Round 2**:
   - New drawer is assigned
   - New word is given
   - Timer resets
   - Drawing canvas clears
   - Scores persist

2. **Complete all rounds**:
   - Play through all 3 rounds
   - Verify final scores
   - Verify game ends properly

## Expected Behavior

### Game Start
- ✅ Game state is properly initialized
- ✅ First drawer is assigned
- ✅ Word is distributed correctly (drawer sees word, others see blanks)
- ✅ Timer starts counting down
- ✅ Drawing tools appear for drawer only

### Drawing
- ✅ Only current drawer can draw
- ✅ Drawing appears in real-time for all players
- ✅ Color and brush size tools work
- ✅ Clear canvas button works

### Guessing
- ✅ Non-drawers can submit guesses
- ✅ Correct guesses award points
- ✅ Round ends when word is guessed
- ✅ Next round starts automatically

### Round Progression
- ✅ Drawer rotates each round
- ✅ New word is assigned
- ✅ Timer resets
- ✅ Canvas clears
- ✅ Scores persist

### Game End
- ✅ All rounds complete
- ✅ Final scores are displayed
- ✅ Game state resets properly

## Debugging Tips

### Check Console Logs
- Frontend: Open browser dev tools and check console
- Backend: Check terminal output for errors
- Socket: Check socket server logs

### Common Issues
1. **Socket not connecting**: Check if socket server is running on port 8001
2. **Game not starting**: Verify at least 2 players are ready
3. **Drawing not syncing**: Check socket connection status
4. **Guesses not working**: Verify game is active and user is not drawer

### Manual Testing Commands
```bash
# Test socket connection
curl -X GET http://localhost:8001

# Test API endpoints
curl -X GET http://localhost:8000/api/health
curl -X GET http://localhost:8000/api/rooms/public
```

## Success Criteria
- [ ] 2 players can join a room
- [ ] Game starts when both players are ready
- [ ] Drawing syncs in real-time
- [ ] Word guessing works correctly
- [ ] Rounds progress automatically
- [ ] Scores are calculated and displayed
- [ ] Game ends after all rounds
- [ ] No console errors during gameplay 