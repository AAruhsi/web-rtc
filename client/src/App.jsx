import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import './index.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '/';

function App() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState(null);
  const [logs, setLogs] = useState([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const roomIdRef = useRef('');
  const socketRef = useRef(null);

  const processIceCandidatesQueue = async () => {
    if (iceCandidatesQueue.current.length > 0 && peerConnectionRef.current) {
      for (const candidate of iceCandidatesQueue.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error(`Error adding queued ICE candidate: ${e.message}`);
        }
      }
      iceCandidatesQueue.current = [];
    }
  };

  // WebRTC config with public STUN servers
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  const addLog = (msg) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);
    socketRef.current = s;
    addLog('System initialization: Connecting to signaling server...');

    s.on('connect', () => {
      addLog(`Connected to server (${SERVER_URL}) with socket ID: ${s.id}`);
    });

    s.on('connect_error', (err) => {
      addLog(`Connection error: ${err.message}`);
    });

    s.on('room-full', () => {
      addLog('Error: Room is full. Cannot join.');
      setJoined(false);
    });

    s.on('user-joined', async ({ socketId }) => {
      addLog(`Peer joined room: ${socketId}`);
      addLog('Initiating call automatically as caller...');
      await createOffer();
    });

    s.on('offer', async (data) => {
      addLog('Received WebRTC Offer from peer');
      await createAnswer(data.offer);
    });

    s.on('answer', async (data) => {
      addLog('Received WebRTC Answer from peer');
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          await processIceCandidatesQueue();
        } catch (e) {
          addLog(`Error setting remote description: ${e.message}`);
        }
      }
    });

    s.on('ice-candidate', async (data) => {
      addLog('Received ICE candidate from peer');
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          addLog(`Error adding ICE candidate: ${e.message}`);
        }
      } else {
        iceCandidatesQueue.current.push(data.candidate);
      }
    });

    s.on('disconnect', () => {
      addLog('Disconnected from signaling server.');
    });

    // Handle peer disconnect from another socket event that server emits
    s.on('user-disconnected', (data) => {
      // socket.io-client might confusingly interpret the string name 'disconnect' for its own disconnection
      // Let's assume data has socketId if it came from custom event 
      if (data && data.socketId) {
        addLog(`Peer disconnected: ${data.socketId}`);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        createPeerConnection(); // Re-initialize for next call
      }
    });

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (joined && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [joined]);

  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      addLog('Successfully accessed local media devices (Camera & Mic)');
    } catch (err) {
      addLog(`Error accessing media devices: ${err.message}`);
    }
  };

  const createPeerConnection = () => {
    addLog('Creating new RTCPeerConnection...');
    const pc = new RTCPeerConnection(iceServers);

    // Add local tracks to pc
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
      addLog('Added local media tracks to PeerConnection');
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { roomId: roomIdRef.current, candidate: event.candidate });
      }
    };

    // Handle incoming streams
    pc.ontrack = (event) => {
      addLog('Received remote media track from peer');
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        // Ensure playback
        remoteVideoRef.current.play().catch(err => {
          console.error("Error playing remote video:", err);
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const handleJoin = async () => {
    if (!roomId) return;
    addLog(`Attempting to join room: ${roomId}`);
    await getMedia();
    createPeerConnection();
    socketRef.current.emit('join-room', { roomId: roomIdRef.current });
    setJoined(true);
  };

  const createOffer = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      addLog('Creating WebRTC Offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('offer', { roomId: roomIdRef.current, offer });
      addLog('WebRTC Offer sent to peer');
    } catch (e) {
      addLog(`Failed to create offer: ${e.message}`);
    }
  };

  const createAnswer = async (offerParams) => {
    let pc = peerConnectionRef.current;
    if (!pc) {
      pc = createPeerConnection();
    }
    try {
      addLog('Setting Remote Description from Offer...');
      await pc.setRemoteDescription(new RTCSessionDescription(offerParams));
      await processIceCandidatesQueue();
      addLog('Creating WebRTC Answer...');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('answer', { roomId: roomIdRef.current, answer });
      addLog('WebRTC Answer sent to peer');
    } catch (e) {
      addLog(`Failed to create answer: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Main Video Section */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-medium text-white tracking-tight">WebRTC Client</h2>
              <p className="text-neutral-400 text-sm">Join a room to connect and start transmitting video.</p>
            </div>
          )}

          {/* Local Video PIP */}
          {joined && (
            <div className="absolute bottom-6 right-6 w-32 sm:w-48 aspect-video rounded-xl overflow-hidden shadow-2xl border border-neutral-700/50 bg-neutral-900 z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="flex flex-col gap-6">
          <div className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800 backdrop-blur ">
            <h1 className="text-lg font-medium mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Connection Setting
            </h1>

            {!joined ? (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Room ID</label>
                <input
                  type="text"
                  placeholder="e.g. test-room-1"
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    roomIdRef.current = e.target.value;
                  }}
                  className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all font-mono text-sm placeholder-neutral-600"
                />
                <button
                  onClick={handleJoin}
                  disabled={!roomId.trim()}
                  className="w-full mt-2 py-3 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500 mb-1">Current Room</span>
                    <span className="font-mono text-sm text-neutral-300">{roomId}</span>
                  </div>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Active
                  </span>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-medium transition-colors"
                >
                  Leave Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
