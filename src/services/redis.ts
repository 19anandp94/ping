import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Redis client with error handling
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

export default redis; 