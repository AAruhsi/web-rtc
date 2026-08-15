import { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL, ICE_SERVERS } from '../config/constants.js';

function getInitialRoomId() {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (roomParam) return roomParam;
  return sessionStorage.getItem('active_room') || '';
}

function mapIceStateToCallStatus(iceState) {
  switch (iceState) {
    case 'checking':
      return 'connecting';
    case 'connected':
    case 'completed':
      return 'connected';
    case 'disconnected':
      return 'reconnecting';
    case 'failed':
      return 'failed';
    default:
      return null;
  }
}

export function useVideoCall() {
  const [roomId, setRoomId] = useState(getInitialRoomId);
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [signalingStatus, setSignalingStatus] = useState('connecting');
  const [callStatus, setCallStatus] = useState('idle');
  const [roomFullError, setRoomFullError] = useState(null);
  const [mediaError, setMediaError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const roomIdRef = useRef(roomId);
  const socketRef = useRef(null);
  const handlersRef = useRef({});
  const hasAutoJoinedRef = useRef(false);

  const addLog = useCallback((msg) => {
    console.debug(`${new Date().toLocaleTimeString()} - ${msg}`);
  }, []);

  const cleanupSession = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    iceCandidatesQueue.current = [];
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const processIceCandidatesQueue = useCallback(async () => {
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
  }, []);

  const attachConnectionStateListeners = useCallback((pc) => {
    pc.oniceconnectionstatechange = () => {
      const mapped = mapIceStateToCallStatus(pc.iceConnectionState);
      if (mapped) {
        setCallStatus(mapped);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        setCallStatus('failed');
      }
    };
  }, []);

  const createPeerConnection = useCallback(() => {
    addLog('Creating new RTCPeerConnection...');
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
      addLog('Added local media tracks to PeerConnection');
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          roomId: roomIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      addLog('Received remote media track from peer');
      setCallStatus('connected');
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        remoteVideoRef.current.play().catch((err) => {
          console.error('Error playing remote video:', err);
        });
      }
    };

    attachConnectionStateListeners(pc);
    peerConnectionRef.current = pc;
    return pc;
  }, [addLog, attachConnectionStateListeners]);

  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      setCallStatus('connecting');
      addLog('Creating WebRTC Offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('offer', { roomId: roomIdRef.current, offer });
      addLog('WebRTC Offer sent to peer');
    } catch (e) {
      addLog(`Failed to create offer: ${e.message}`);
      setCallStatus('failed');
    }
  }, [addLog]);

  const createAnswer = useCallback(async (offerParams) => {
    let pc = peerConnectionRef.current;
    if (!pc) {
      pc = createPeerConnection();
    }
    try {
      setCallStatus('connecting');
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
      setCallStatus('failed');
    }
  }, [addLog, createPeerConnection, processIceCandidatesQueue]);

  const handlePeerDisconnected = useCallback((socketId) => {
    addLog(`Peer disconnected: ${socketId}`);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    iceCandidatesQueue.current = [];
    setCallStatus('waiting');
    createPeerConnection();
  }, [addLog, createPeerConnection]);

  const handleRoomFull = useCallback(() => {
    addLog('Error: Room is full. Cannot join.');
    sessionStorage.removeItem('active_room');
    cleanupSession();
    setJoined(false);
    setCallStatus('idle');
    setRoomFullError('This room is full (max 2 users). Create a new room or try a different room ID.');
  }, [addLog, cleanupSession]);

  const updateRoomId = useCallback((id) => {
    setRoomId(id);
    roomIdRef.current = id;
    setRoomFullError(null);
  }, []);

  const getMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setMediaError(null);
      addLog('Successfully accessed local media devices (Camera & Mic)');
      return true;
    } catch (err) {
      const message =
        err.name === 'NotAllowedError'
          ? 'Camera and microphone access was denied. Please allow permissions and try again.'
          : `Could not access camera or microphone: ${err.message}`;
      setMediaError(message);
      addLog(message);
      return false;
    }
  }, [addLog]);

  const joinRoom = useCallback(async () => {
    if (!roomIdRef.current) return;
    addLog(`Attempting to join room: ${roomIdRef.current}`);

    setRoomFullError(null);
    setMediaError(null);

    const url = new URL(window.location);
    url.searchParams.set('room', roomIdRef.current);
    window.history.pushState({}, '', url);

    sessionStorage.setItem('active_room', roomIdRef.current);

    const mediaOk = await getMedia();
    if (!mediaOk) return;

    createPeerConnection();
    if (socketRef.current) {
      socketRef.current.emit('join-room', { roomId: roomIdRef.current });
    }
    setJoined(true);
    setCallStatus('waiting');
  }, [addLog, getMedia, createPeerConnection]);

  useEffect(() => {
    handlersRef.current = {
      addLog,
      createOffer,
      createAnswer,
      processIceCandidatesQueue,
      handlePeerDisconnected,
      handleRoomFull,
      joinRoom,
    };
  }, [addLog, createOffer, createAnswer, processIceCandidatesQueue, handlePeerDisconnected, handleRoomFull, joinRoom]);

  useEffect(() => {
    const s = io(SERVER_URL);
    socketRef.current = s;
    setSignalingStatus('connecting');
    handlersRef.current.addLog('System initialization: Connecting to signaling server...');

    s.on('connect', () => {
      setSignalingStatus('connected');
      handlersRef.current.addLog(`Connected to server (${SERVER_URL}) with socket ID: ${s.id}`);

      const savedRoom = sessionStorage.getItem('active_room') || getInitialRoomId();
      if (savedRoom && !hasAutoJoinedRef.current) {
        hasAutoJoinedRef.current = true;
        handlersRef.current.addLog(`Auto-rejoining room: ${savedRoom}`);
        updateRoomId(savedRoom);
        handlersRef.current.joinRoom();
      }
    });

    s.on('connect_error', (err) => {
      setSignalingStatus('disconnected');
      handlersRef.current.addLog(`Connection error: ${err.message}`);
    });

    s.on('room-full', () => {
      handlersRef.current.handleRoomFull();
    });

    s.on('user-joined', async ({ socketId }) => {
      handlersRef.current.addLog(`Peer joined room: ${socketId}`);
      handlersRef.current.addLog('Initiating call automatically as caller...');
      await handlersRef.current.createOffer();
    });

    s.on('offer', async (data) => {
      handlersRef.current.addLog('Received WebRTC Offer from peer');
      await handlersRef.current.createAnswer(data.offer);
    });

    s.on('answer', async (data) => {
      handlersRef.current.addLog('Received WebRTC Answer from peer');
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          await handlersRef.current.processIceCandidatesQueue();
        } catch (e) {
          handlersRef.current.addLog(`Error setting remote description: ${e.message}`);
          setCallStatus('failed');
        }
      }
    });

    s.on('ice-candidate', async (data) => {
      handlersRef.current.addLog('Received ICE candidate from peer');
      if (peerConnectionRef.current?.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          handlersRef.current.addLog(`Error adding ICE candidate: ${e.message}`);
        }
      } else {
        iceCandidatesQueue.current.push(data.candidate);
      }
    });

    s.on('disconnect', () => {
      setSignalingStatus('disconnected');
      handlersRef.current.addLog('Disconnected from signaling server.');
    });

    s.on('user-disconnected', (data) => {
      if (data?.socketId) {
        handlersRef.current.handlePeerDisconnected(data.socketId);
      }
    });

    return () => {
      s.disconnect();
    };
  }, [updateRoomId]);

  useEffect(() => {
    if (joined && localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, [joined, isVideoOff]);

  const generateRoomId = useCallback(() => {
    const randomId = Math.random().toString(36).substring(2, 9);
    updateRoomId(randomId);
  }, [updateRoomId]);

  const copyShareLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    addLog('Shareable link copied to clipboard!');
  }, [addLog]);

  const leaveSession = useCallback(() => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('leave-room', { roomId: roomIdRef.current });
    }

    sessionStorage.removeItem('active_room');

    cleanupSession();
    setJoined(false);
    setCallStatus('idle');

    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.pathname + url.search);
  }, [cleanupSession]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = !videoTrack.enabled;
    const nextVideoOff = !videoTrack.enabled;
    setIsVideoOff(nextVideoOff);

    if (!nextVideoOff && localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, []);

  return {
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
  };
}
