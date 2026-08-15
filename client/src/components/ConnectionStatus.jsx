const CALL_STATUS = {
  idle: { label: 'Not in call', dot: 'bg-neutral-500', text: 'text-neutral-400', bg: 'bg-neutral-500/10' },
  waiting: { label: 'Waiting for peer', dot: 'bg-yellow-500 animate-pulse', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  connecting: { label: 'Connecting', dot: 'bg-yellow-500 animate-pulse', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  connected: { label: 'Connected', dot: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/10' },
  reconnecting: { label: 'Reconnecting', dot: 'bg-orange-500 animate-pulse', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  failed: { label: 'Connection failed', dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' },
};

const SIGNALING_STATUS = {
  connecting: { label: 'Signaling server: Connecting…', dot: 'bg-yellow-500 animate-pulse', text: 'text-yellow-400' },
  connected: { label: 'Signaling server: Connected', dot: 'bg-green-500', text: 'text-green-400' },
  disconnected: { label: 'Signaling server: Disconnected', dot: 'bg-red-500', text: 'text-red-400' },
};

function StatusRow({ label, dot, text, bg }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg || 'bg-neutral-950'}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </div>
  );
}

export default function ConnectionStatus({ signalingStatus, callStatus, joined }) {
  const call = CALL_STATUS[callStatus] || CALL_STATUS.idle;
  const signaling = SIGNALING_STATUS[signalingStatus] || SIGNALING_STATUS.connecting;

  return (
    <div className="flex flex-col gap-2">
      <StatusRow {...signaling} />
      {joined && <StatusRow {...call} bg={call.bg} />}
    </div>
  );
}
