import { Server } from 'socket.io';
import { registerSocketHandlers } from './handlers.js';
import { SOCKET_EVENTS } from '../config/constants.js';
import { ALLOWED_ORIGINS } from '../config/cors.js';
import { logger } from '../utils/logger.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info(`User connected: ${socket.id}`);
    
    // Register all specific WebSocket event handlers
    registerSocketHandlers(io, socket);
  });

  return io;
};
