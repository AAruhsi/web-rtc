import dotenv from 'dotenv';
dotenv.config();

const envOrigins = process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS;

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
];

const parsedEnvOrigins = envOrigins
  ? envOrigins.split(',').map((origin) => origin.trim())
  : [];

export const ALLOWED_ORIGINS = Array.from(
  new Set([...parsedEnvOrigins, ...defaultOrigins].filter(Boolean))
);
