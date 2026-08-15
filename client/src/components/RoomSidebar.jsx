import JoinForm from './JoinForm.jsx';
import ActiveRoomPanel from './ActiveRoomPanel.jsx';
import ConnectionStatus from './ConnectionStatus.jsx';

export default function RoomSidebar({
  joined,
  roomId,
  roomFullError,
  mediaError,
  signalingStatus,
  callStatus,
  isMuted,
  isVideoOff,
  onRoomIdChange,
  onGenerateRoomId,
  onJoin,
  onToggleMute,
  onToggleVideo,
  onCopyShareLink,
  onLeave,
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800 backdrop-blur">
        <h1 className="text-lg font-medium mb-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Connection Setting
        </h1>

        {!joined ? (
          <>
            <div className="mb-4">
              <ConnectionStatus
                signalingStatus={signalingStatus}
                callStatus={callStatus}
                joined={false}
              />
            </div>
            <JoinForm
              roomId={roomId}
              roomFullError={roomFullError}
              mediaError={mediaError}
              onRoomIdChange={onRoomIdChange}
              onGenerateRoomId={onGenerateRoomId}
              onJoin={onJoin}
            />
          </>
        ) : (
          <ActiveRoomPanel
            roomId={roomId}
            signalingStatus={signalingStatus}
            callStatus={callStatus}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onToggleMute={onToggleMute}
            onToggleVideo={onToggleVideo}
            onCopyShareLink={onCopyShareLink}
            onLeave={onLeave}
          />
        )}
      </div>
    </div>
  );
}
