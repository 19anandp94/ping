// redisClient.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost', // or your Redis server
  port: 6379,
});

export default redis;
