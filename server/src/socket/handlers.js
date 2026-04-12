import { SOCKET_EVENTS } from '../config/constants.js';
import { createOrJoinRoom, leaveRoom, getRoomsBySocketId } from '../rooms/roomManager.js';
import { logger } from '../utils/logger.js';

export const registerSocketHandlers = (io, socket) => {
  
  // 1. Join Room
  socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomId }) => {
    logger.info(`Received join-room request from ${socket.id} for room ${roomId}`);
    
    const result = createOrJoinRoom(roomId, socket.id);

    if (result.isFull) {
      socket.emit(SOCKET_EVENTS.ROOM_FULL);
      return;
    }

    socket.join(roomId);

    // Notify other user if they exist
    if (result.otherUser) {
      socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, { socketId: socket.id });
    }
  });

  // 2. Offer (Caller -> Receiver)
  socket.on(SOCKET_EVENTS.OFFER, (data) => {
    logger.debug(`Offer received from ${socket.id} for room ${data.roomId}`);
    socket.to(data.roomId).emit(SOCKET_EVENTS.OFFER, data);
  });

  // 3. Answer (Receiver -> Caller)
  socket.on(SOCKET_EVENTS.ANSWER, (data) => {
    logger.debug(`Answer received from ${socket.id} for room ${data.roomId}`);
    socket.to(data.roomId).emit(SOCKET_EVENTS.ANSWER, data);
  });

  // 4. ICE Candidates
  socket.on(SOCKET_EVENTS.ICE_CANDIDATE, (data) => {
    logger.debug(`ICE candidate received from ${socket.id} for room ${data.roomId}`);
    socket.to(data.roomId).emit(SOCKET_EVENTS.ICE_CANDIDATE, data);
  });

  // 5. User Disconnect
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    logger.info(`User disconnected: ${socket.id}`);
    
    // Cleanup user from all rooms they were in
    const activeRooms = getRoomsBySocketId(socket.id);
    activeRooms.forEach((roomId) => {
      leaveRoom(roomId, socket.id);
      socket.to(roomId).emit(SOCKET_EVENTS.USER_DISCONNECTED, { socketId: socket.id });
    });
  });
};
