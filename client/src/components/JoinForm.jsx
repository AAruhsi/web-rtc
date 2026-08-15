export default function JoinForm({
  roomId,
  roomFullError,
  mediaError,
  onRoomIdChange,
  onGenerateRoomId,
  onJoin,
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Room ID</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. test-room-1"
          value={roomId}
          onChange={(e) => onRoomIdChange(e.target.value)}
          className="flex-1 w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all font-mono text-sm placeholder-neutral-600"
        />
        <button
          type="button"
          onClick={onGenerateRoomId}
          className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors shrink-0"
          title="Generate Random Room"
        >
          🎲
        </button>
      </div>

      {roomFullError && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {roomFullError}
        </div>
      )}

      {mediaError && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {mediaError}
        </div>
      )}

      <button
        type="button"
        onClick={onJoin}
        disabled={!roomId.trim()}
        className="w-full mt-2 py-3 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Join Room
      </button>
    </div>
  );
}
