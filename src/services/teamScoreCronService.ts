import cron from 'node-cron';
import EventStats from '../models/EventStats';
import { Team } from '../models/Team';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Redis client with error handling
let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
    redis = null;
  });
} catch (error) {
  console.error('Failed to initialize Redis:', error);
  redis = null;
}

interface LeaderboardEntry {
  username: string;
  teamName: string;
  score: number;
  rank: number;
}

interface EventStat {
  shortScore: number;
  shortId: string;
}

// Function to update team scores and leaderboard
const updateTeamScores = async () => {
  try {
    console.log('Team score cron job running at:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

    // 1. Get unique eventIds from active EventStats
    const activeStats = await EventStats.find({ status: 'active' }).distinct('eventId');
    
    for (const eventId of activeStats) {
      // 2. Get all teams for this event
      const teams = await Team.find({ eventId });
      
      // 3. Update team scores
      for (const team of teams) {
        // Get scores for team's shorts
        const teamShorts = await EventStats.find({
          eventId,
          shortId: { $in: team.shorts },
          status: 'active'
        });

        // Calculate total score
        const totalScore = teamShorts.reduce((sum: number, stat: any) => sum + (stat.shortScore || 0), 0);
        console.log(`Calculated total score for team ${team._id}: ${totalScore}`);
        
        // Update team score
        const updatedTeam = await Team.findByIdAndUpdate(
          team._id, 
          { $set: { score: totalScore } },
          { new: true }
        );
        console.log(`Updated team score in MongoDB:`, updatedTeam);

        // 4. Update Redis leaderboard if Redis is available
        if (redis) {
          try {
            const leaderboardKey = `leaderboard:${eventId}`;
            
            // Clear existing leaderboard for this event
            await redis.del(leaderboardKey);
            console.log(`Cleared existing leaderboard for event ${eventId}`);

            // Process each team
            for (const team of teams) {
              // Calculate score for this specific team
              const teamShorts = await EventStats.find({
                eventId,
                shortId: { $in: team.shorts },
                status: 'active'
              });
              const teamScore = teamShorts.reduce((sum: number, stat: any) => sum + (stat.shortScore || 0), 0);
              console.log(`Calculated score for team ${team._id}: ${teamScore}`);

              const entry: LeaderboardEntry = {
                username: team.userId.toString(),
                teamName: team.name,
                score: teamScore,
                rank: 0
              };

              // Use combination of userId and teamId as unique identifier
              const memberKey = `user:${team.userId}_team:${team._id}`;
              console.log('Adding to Redis:', { key: leaderboardKey, memberKey, entry });
              
              // Add new entry with memberKey as the identifier
              const result = await redis.zadd(leaderboardKey, teamScore, memberKey);
              console.log('Redis zadd result:', result);
            }

            // Update ranks in Redis
            const entries = await redis.zrevrange(leaderboardKey, 0, -1, 'WITHSCORES');
            console.log('Redis entries:', entries);
            
            for (let i = 0; i < entries.length; i += 2) {
              const memberKey = entries[i];
              const score = entries[i + 1];
              const rank = Math.floor(i / 2) + 1;
              
              // Get the team data from MongoDB
              const [userId, teamId] = memberKey.split('_').map(part => part.split(':')[1]);
              const teamData = await Team.findById(teamId);
              
              if (teamData) {
                const updatedEntry: LeaderboardEntry = {
                  username: userId,
                  teamName: teamData.name,
                  score: parseInt(score),
                  rank
                };
                
                // Update the entry with rank
                await redis.zrem(leaderboardKey, memberKey);
                await redis.zadd(leaderboardKey, score, JSON.stringify(updatedEntry));
                console.log(`Updated rank ${rank} for team ${teamData.name}`);
              }
            }

            console.log(`Updated leaderboard for event ${eventId}`);
          } catch (redisError) {
            console.error('Redis operation failed:', redisError);
          }
        } else {
          console.log('Redis not available, skipping leaderboard update');
        }
      }
    }
  } catch (error) {
    console.error('Error in updateTeamScores:', error);
  }
};

// Function to start the cron job
export const startTeamScoreCron = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await updateTeamScores();
  });
  
  console.log('Team score cron job started - running every 5 minutes');
}; 