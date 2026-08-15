import { useState, useCallback } from 'react';
import CallControls from './CallControls.jsx';
import ConnectionStatus from './ConnectionStatus.jsx';

export default function ActiveRoomPanel({
  roomId,
  signalingStatus,
  callStatus,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onCopyShareLink,
  onLeave,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (onCopyShareLink) {
      await onCopyShareLink();
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2500);
  }, [onCopyShareLink]);

  return (
    <div className="flex flex-col gap-4">
      <ConnectionStatus
        signalingStatus={signalingStatus}
        callStatus={callStatus}
        joined
      />

      <div className="flex flex-col gap-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">Current Room</span>
          <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono">2 Max</span>
        </div>
        <span className="font-mono text-sm text-neutral-300 truncate">{roomId}</span>
      </div>

      <CallControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
      />

      <div className="relative">
        {copied && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-emerald-500 text-neutral-950 text-xs font-semibold rounded-lg shadow-xl flex items-center gap-1.5 transition-all animate-bounce z-30 whitespace-nowrap">
            <svg className="w-4 h-4 text-neutral-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Link Copied to Clipboard!
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rotate-45" />
          </div>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border shadow-sm ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-2 ring-emerald-500/20'
              : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied to Clipboard!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Copy Share Link
            </>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-medium transition-colors"
      >
        Leave Session
      </button>
    </div>
  );
}
