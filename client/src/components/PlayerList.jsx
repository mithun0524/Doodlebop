function PlayerList({ players, currentDrawerId, currentUserId }) {
  const sortedPlayers = [...(players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-neutral-900 rounded-lg border-2 border-white p-4 h-full flex flex-col">
      <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wide flex-shrink-0">Leaderboard</h3>
      <div className="space-y-2 overflow-y-auto flex-1" role="list" aria-label="Player leaderboard">
        {sortedPlayers.map((player, index) => {
          const isDrawer = currentDrawerId && player.id === currentDrawerId;
          const isCurrentUser = currentUserId && player.id === currentUserId;
          
          return (
            <div
              key={player.id}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                isCurrentUser
                  ? 'bg-white text-black border-white'
                  : 'bg-black border-neutral-800 hover:border-white'
              }`}
              role="listitem"
              aria-label={`${index + 1}. ${player.username}, ${player.score} points${isDrawer ? ', drawing' : ''}${player.hasGuessed ? ', guessed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCurrentUser ? 'bg-black text-white' : 'bg-white text-black'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{player.username}</div>
                    {isCurrentUser && (
                      <div className="text-[10px] opacity-60">You</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <div className="text-center">
                    <div className={`text-xs opacity-60 uppercase tracking-widest ${isCurrentUser ? 'text-black' : 'text-neutral-400'}`}>Score</div>
                    <div className="font-bold text-base">{player.score}</div>
                  </div>
                </div>
              </div>
              {(isDrawer || player.hasGuessed) && (
                <div className="flex gap-2 mt-2 text-xs font-medium">
                  {isDrawer && (
                    <div className={`px-2 py-0.5 rounded ${isCurrentUser ? 'bg-black text-white' : 'bg-neutral-800 text-white'}`}>
                      Drawing
                    </div>
                  )}
                  {player.hasGuessed && (
                    <div className={`px-2 py-0.5 rounded ${isCurrentUser ? 'bg-black text-white' : 'bg-neutral-800 text-white'}`}>
                      Guessed
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlayerList;

