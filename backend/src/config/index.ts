import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

export const prisma = new PrismaClient();

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err: Error) => console.error('[Redis] error:', err));

export const JWT_SECRET = process.env.JWT_SECRET || 'honey-group-super-secret-2026';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const S3_CONFIG = {
  bucket: process.env.AWS_S3_BUCKET || 'honey-group-docs',
  region: process.env.AWS_REGION || 'af-south-1',
};

export const PORT = parseInt(process.env.PORT || '5000', 10);
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';