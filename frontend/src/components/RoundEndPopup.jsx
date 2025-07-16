import React from 'react';
import { Trophy, Medal, Award, ArrowLeft } from 'lucide-react';
import Button from './Button';

const RoundEndPopup = ({ 
  isOpen, 
  onClose, 
  roundNumber, 
  word, 
  players, 
  onGoToDashboard 
}) => {
  if (!isOpen) return null;

  // Sort players by score in descending order
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 text-gray-500 text-sm font-bold">{rank}</span>;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-500 text-white p-6 rounded-t-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Final Round Complete!</h2>
            <p className="text-blue-100">The word was: <span className="font-semibold">{word}</span></p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Player Rankings */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              Current Rankings
            </h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 rounded-lg border-2 bg-white border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8">
                        {getRankIcon(rank)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{player.username}</p>
                        <p className="text-sm text-gray-600">
                          {rank === 1 ? '🥇 1st Place' : 
                           rank === 2 ? '🥈 2nd Place' : 
                           rank === 3 ? '🥉 3rd Place' : 
                           `${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} Place`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">{player.score || 0}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              View Final Results
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

export default RoundEndPopup; 