import { google } from 'googleapis';
import { Event } from '../models/Event';
import { Short } from '../models/Short';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

// YouTube API configuration
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// Emoji and color mapping for different video categories
const categoryMapping = {
  'Entertainment': { emoji: '🎬', color: '#FF6B6B' },
  'Music': { emoji: '🎵', color: '#4ECDC4' },
  'Gaming': { emoji: '🎮', color: '#45B7D1' },
  'Sports': { emoji: '⚽', color: '#96CEB4' },
  'Education': { emoji: '📚', color: '#FFEEAD' },
  'Technology': { emoji: '💻', color: '#D4A5A5' },
  'Comedy': { emoji: '😂', color: '#9B59B6' },
  'News': { emoji: '📰', color: '#3498DB' },
  'default': { emoji: '🎥', color: '#CCCCCC' }
};

// Function to get category mapping
const getCategoryMapping = (categoryId: string): { emoji: string, color: string } => {
  switch (categoryId) {
    case '24': return categoryMapping['Entertainment'];
    case '10': return categoryMapping['Music'];
    case '20': return categoryMapping['Gaming'];
    case '17': return categoryMapping['Sports'];
    case '27': return categoryMapping['Education'];
    case '28': return categoryMapping['Technology'];
    case '23': return categoryMapping['Comedy'];
    case '25': return categoryMapping['News'];
    default: return categoryMapping['default'];
  }
};

// Function to fetch trending videos for a region
const fetchTrendingVideos = async (regionCode: string = 'IN'): Promise<any[]> => {
  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      chart: 'mostPopular',
      regionCode,
      maxResults: 20
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    return [];
  }
};

// Function to create shorts for an event
const createShortsForEvent = async (eventId: string) => {
  try {
    // Check if shorts already exist for this event
    const existingShorts = await Short.find({ eventId });
    
    if (existingShorts.length === 0) {
      // Fetch trending videos
      const trendingVideos = await fetchTrendingVideos();
      
      // Create shorts from trending videos
      const shortsToCreate = trendingVideos.map(video => {
        // Get category info with fallback to default if categoryId is missing or invalid
        const categoryInfo = video.snippet?.categoryId 
          ? getCategoryMapping(video.snippet.categoryId) 
          : categoryMapping['default'];
        
        return {
          eventId,
          title: video.snippet?.title || 'Untitled Video',
          views: parseInt(video.statistics?.viewCount) || 0,
          emoji: categoryInfo.emoji,
          color: categoryInfo.color,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
          thumbnailUrl: video.snippet?.thumbnails?.high?.url || '',
          likes: parseInt(video.statistics?.likeCount) || 0,
          comments: parseInt(video.statistics?.commentCount) || 0
        };
      });
      
      await Short.insertMany(shortsToCreate);
      console.log(`Shorts created for event ${eventId}`);
    }
  } catch (error) {
    console.error(`Error creating shorts for event ${eventId}:`, error);
  }
};

// Function to initialize shorts for all events
const initializeShorts = async () => {
  try {
    const events = await Event.find({});
    
    for (const event of events) {
      await createShortsForEvent(event._id.toString());
    }
    
    console.log('Shorts initialized successfully');
  } catch (error) {
    console.error('Error initializing shorts:', error);
  }
};

// Function to update shorts with latest trending videos
const updateShorts = async () => {
  try {
    const events = await Event.find({});
    
    for (const event of events) {
      // Delete existing shorts
      await Short.deleteMany({ eventId: event._id });
      
      // Create new shorts
      await createShortsForEvent(event._id.toString());
    }
    
    console.log('Shorts updated successfully');
  } catch (error) {
    console.error('Error updating shorts:', error);
  }
};

// Function to start the cron job
export const startYoutubeCron = () => {
  // Initialize shorts on startup
  initializeShorts();
  
  // Update shorts every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    await updateShorts();
  });
}; 