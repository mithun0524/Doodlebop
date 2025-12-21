function PlayerList({ players, currentDrawerId, currentUserId }) {
  const sortedPlayers = [...(players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <h3 className="text-white font-semibold mb-4">Players</h3>
      <div className="space-y-2">
        {sortedPlayers.map((player) => {
          const isDrawer = currentDrawerId && player.id === currentDrawerId;
          const isCurrentUser = currentUserId && player.id === currentUserId;
          
          return (
            <div
              key={player.id}
              className={`p-3 rounded-lg border ${
                isCurrentUser
                  ? 'bg-blue-900/30 border-blue-600'
                  : 'bg-gray-700 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDrawer && (
                    <span className="text-yellow-400" title="Drawing">👑</span>
                  )}
                  <span className={`font-medium ${isCurrentUser ? 'text-blue-300' : 'text-white'}`}>
                    {player.username}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-blue-400">(You)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {player.hasGuessed && (
                    <span className="text-green-400 text-sm" title="Guessed correctly">✓</span>
                  )}
                  <span className="text-white font-semibold">{player.score}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlayerList;

