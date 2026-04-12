import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocket } from './socket/socket.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Determine the port
const PORT = process.env.PORT || 5000;

// Optional Health / Debug APIs
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Signaling Server is running' });
});

// Initialize Socket.io
initSocket(server);

// Start Server
server.listen(PORT, () => {
  logger.info(`Signaling Server running on port ${PORT}`);
});
