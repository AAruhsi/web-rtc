export default function VideoSection({ joined, isVideoOff, localVideoRef, remoteVideoRef }) {
  return (
    <div className="lg:col-span-3 relative rounded-2xl overflow-hidden bg-black shadow-2xl shadow-blue-900/10 h-[60vh] sm:h-[75vh] lg:h-[85vh] border border-neutral-800 flex items-center justify-center">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />

      {!joined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur z-10 gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-medium text-white tracking-tight">WebRTC Client</h2>
          <p className="text-neutral-400 text-sm">Join a room to connect and start transmitting video.</p>
        </div>
      )}

      {joined && (
        <div className="absolute bottom-6 right-6 w-32 sm:w-48 aspect-video rounded-xl overflow-hidden shadow-2xl border border-neutral-700/50 bg-neutral-900 z-20 relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? 'hidden' : 'block'}`}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
              <svg className="w-8 h-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
