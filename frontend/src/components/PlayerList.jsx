import React from 'react';
import { Users, Crown, CheckCircle, Clock } from 'lucide-react';
import useGameStore from '../store/gameStore';

const PlayerList = ({ players }) => {
  const { gameState, isGameActive } = useGameStore();
  
  // Get current drawer from game state
  const currentDrawer = gameState?.current_drawer_id ? { id: gameState.current_drawer_id } : null;

  const getPlayerStatus = (player) => {
    if (!isGameActive) {
      return player.is_ready ? 'Ready' : 'Not Ready';
    }
    
    if (currentDrawer?.id === player.user_id) {
      return 'Drawing';
    }
    
    return 'Guessing';
  };

  const getPlayerIcon = (player) => {
    if (currentDrawer?.id === player.user_id) {
      return <Crown className="w-4 h-4 text-yellow-500" />;
    }
    
    if (player.is_ready) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="card">
      <div className="flex items-center space-x-2 p-4 border-b border-gray-200">
        <Users className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-gray-900">Players ({players.length})</h3>
      </div>
      
      <div className="p-4 space-y-3">
        {players.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No players in room</p>
          </div>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(player.username?.charAt(0)?.toUpperCase() || "?")}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {player.username}
                    {currentDrawer?.id === player.user_id && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Drawing
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    Score: {player.score || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getPlayerIcon(player)}
                <span className="text-sm text-gray-600">
                  {getPlayerStatus(player)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlayerList; 