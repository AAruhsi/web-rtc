import './index.css';
import VideoSection from './components/VideoSection.jsx';
import RoomSidebar from './components/RoomSidebar.jsx';
import { useVideoCall } from './hooks/useVideoCall.js';

function App() {
  const {
    roomId,
    joined,
    isMuted,
    isVideoOff,
    signalingStatus,
    callStatus,
    roomFullError,
    mediaError,
    localVideoRef,
    remoteVideoRef,
    updateRoomId,
    generateRoomId,
    joinRoom,
    copyShareLink,
    leaveSession,
    toggleMute,
    toggleVideo,
  } = useVideoCall();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        <VideoSection
          joined={joined}
          isVideoOff={isVideoOff}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
        />

        <RoomSidebar
          joined={joined}
          roomId={roomId}
          roomFullError={roomFullError}
          mediaError={mediaError}
          signalingStatus={signalingStatus}
          callStatus={callStatus}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onRoomIdChange={updateRoomId}
          onGenerateRoomId={generateRoomId}
          onJoin={joinRoom}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onCopyShareLink={copyShareLink}
          onLeave={leaveSession}
        />
      </div>
    </div>
  );
}

export default App;
