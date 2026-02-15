import { Router } from 'express';
import { getInterests } from '../store.js';

export const contentRoutes = Router();

// Placeholder - in production use YouTube API, Google Custom Search, etc.
// For now return mock curated content based on interests
contentRoutes.get('/content/discover', async (req, res) => {
  const userId = req.query.userId || 'default';
  const { interests = [] } = getInterests(userId);
  const topics = interests.slice(0, 3).join(' OR ') || 'technology';
  // Mock - replace with real YouTube/API calls
  const items = [
    { type: 'video', title: 'Top picks for you', url: 'https://youtube.com', thumbnail: null },
    { type: 'article', title: `Explore: ${topics}`, url: 'https://google.com/search?q=' + encodeURIComponent(topics), thumbnail: null },
  ];
  res.json({ items });
});
