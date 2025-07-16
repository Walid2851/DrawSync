import React from 'react';
import { Trophy, Medal, Award, ArrowLeft, Home } from 'lucide-react';
import Button from './Button';

const GameEndPopup = ({ 
  isOpen, 
  onClose, 
  finalScores = {}, 
  players = [], 
  onGoToDashboard 
}) => {
  if (!isOpen) return null;

  // Convert finalScores object to array and sort by score
  const sortedPlayers = (Array.isArray(players) ? players : [])
    .map(player => ({
      ...player,
      score: (finalScores && finalScores[player.id]) || player.score || 0
    }))
    .sort((a, b) => b.score - a.score);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 3:
        return <Award className="w-8 h-8 text-amber-600" />;
      default:
        return <span className="w-8 h-8 text-gray-500 text-lg font-bold">{rank}</span>;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const winner = sortedPlayers[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white p-8 rounded-t-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">🎉 Game Complete! 🎉</h2>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-xl font-semibold mb-2">🏆 Winner</p>
              <p className="text-2xl font-bold">{winner?.username || 'Unknown'}</p>
              <p className="text-lg">{winner?.score || 0} points</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Final Rankings */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              Final Rankings
            </h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 rounded-lg border-2 bg-white border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10">
                        {getRankIcon(rank)}
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-800">{player.username}</p>
                        <p className="text-sm text-gray-600">
                          {rank === 1 ? '🥇 Champion' : 
                           rank === 2 ? '🥈 Runner-up' : 
                           rank === 3 ? '🥉 Third Place' : 
                           `${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} Place`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-800">{player.score}</p>
                      <p className="text-sm text-gray-500">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Statistics */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-800 mb-2">Game Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Players</p>
                <p className="font-semibold">{sortedPlayers.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Highest Score</p>
                <p className="font-semibold">{winner?.score || 0}</p>
              </div>
              <div>
                <p className="text-gray-600">Average Score</p>
                <p className="font-semibold">
                  {Math.round(sortedPlayers.reduce((sum, p) => sum + p.score, 0) / sortedPlayers.length)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Score Range</p>
                <p className="font-semibold">
                  {winner?.score || 0} - {sortedPlayers[sortedPlayers.length - 1]?.score || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              New Game
            </Button>
            <Button
              onClick={onGoToDashboard}
              variant="primary"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameEndPopup; 