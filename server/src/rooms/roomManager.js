import { logger } from '../utils/logger.js';

// In-memory format: { roomId: [socketId1, socketId2] }
const rooms = {};

/**
 * Creates or joins a room for the given socket ID.
 * @param {string} roomId 
 * @param {string} socketId 
 * @returns {object} { success: boolean, isFull: boolean, otherUser: string|null }
 */
export const createOrJoinRoom = (roomId, socketId) => {
  if (!rooms[roomId]) {
    rooms[roomId] = [socketId];
    logger.info(`Room created: ${roomId} by user ${socketId}`);
    return { success: true, isFull: false, otherUser: null };
  }

  const room = rooms[roomId];

  // Limit to 2 users
  if (room.length >= 2) {
    logger.warn(`Room ${roomId} is full. User ${socketId} rejected.`);
    return { success: false, isFull: true, otherUser: null };
  }

  // 1 user is already in the room
  const otherUser = room[0];
  room.push(socketId);
  logger.info(`User ${socketId} joined room ${roomId}`);
  
  return { success: true, isFull: false, otherUser };
};

/**
 * Removes a socket from a room.
 * @param {string} roomId 
 * @param {string} socketId 
 */
export const leaveRoom = (roomId, socketId) => {
  const room = rooms[roomId];
  if (room) {
    rooms[roomId] = room.filter((id) => id !== socketId);
    if (rooms[roomId].length === 0) {
      delete rooms[roomId]; // Cleanup empty room
      logger.info(`Room ${roomId} deleted (empty)`);
    } else {
      logger.info(`User ${socketId} left room ${roomId}`);
    }
  }
};

/**
 * Finds all rooms a given socket ID is currently in.
 * @param {string} socketId 
 * @returns {string[]} Array of room IDs
 */
export const getRoomsBySocketId = (socketId) => {
  return Object.keys(rooms).filter((roomId) => rooms[roomId].includes(socketId));
};

/**
 * Finds the other user in a room.
 * @param {string} roomId 
 * @param {string} socketId 
 * @returns {string|null} The socket ID of the other user, if any
 */
export const getOtherUser = (roomId, socketId) => {
  const room = rooms[roomId];
  if (room) {
    return room.find((id) => id !== socketId) || null;
  }
  return null;
};
