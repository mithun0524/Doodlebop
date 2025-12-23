import { useTheme } from '../context/ThemeContext';

function PlayerList({ players = [], currentDrawerId, currentUserId }) {
  const { theme } = useTheme();
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div
      className="rounded-lg border-2 p-4 h-full flex flex-col"
      style={{ backgroundColor: theme.accent, borderColor: theme.text, color: theme.text }}
    >
      <h3
        className="font-bold mb-4 text-sm uppercase tracking-wide flex-shrink-0"
        style={{ color: theme.text }}
      >
        Leaderboard
      </h3>
      <div className="space-y-2 overflow-y-auto flex-1" role="list" aria-label="Player leaderboard">
        {sortedPlayers.map((player, index) => {
          const isDrawer = currentDrawerId && player.id === currentDrawerId;
          const isCurrentUser = currentUserId && player.id === currentUserId;

          return (
            <div
              key={player.id}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${isCurrentUser ? 'font-bold shadow-lg' : ''}`}
              style={{
                backgroundColor: isCurrentUser ? theme.text : theme.bg,
                color: isCurrentUser ? theme.bg : theme.text,
                borderColor: theme.text
              }}
              role="listitem"
              aria-label={`${index + 1}. ${player.username}, ${player.score} points${isDrawer ? ', drawing' : ''}${player.hasGuessed ? ', guessed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: isCurrentUser ? theme.bg : theme.text,
                    color: isCurrentUser ? theme.text : theme.bg
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 ml-3">
                  <div className="text-sm font-medium truncate" style={{ color: isCurrentUser ? theme.bg : theme.text }}>
                    {player.username}
                  </div>
                  {isCurrentUser && (
                    <div className="text-[10px] opacity-60" style={{ color: isCurrentUser ? theme.bg : theme.text }}>
                      You
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <div className="text-xs opacity-60 uppercase tracking-widest" style={{ color: isCurrentUser ? theme.bg : theme.text }}>
                    Score
                  </div>
                  <div className="font-bold text-base" style={{ color: isCurrentUser ? theme.bg : theme.text }}>
                    {player.score}
                  </div>
                </div>
              </div>

              {(isDrawer || player.hasGuessed) && (
                <div className="flex gap-2 mt-2 text-xs font-medium">
                  {isDrawer && (
                    <div className="px-2 py-0.5 rounded" style={{ backgroundColor: theme.bg, color: theme.text }}>
                      Drawing
                    </div>
                  )}
                  {player.hasGuessed && (
                    <div className="px-2 py-0.5 rounded" style={{ backgroundColor: theme.bg, color: theme.text }}>
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

