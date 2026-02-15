import { Router } from 'express';
import { getHistory, getInterests, setInterests, getInterestsHistory, addInterestsHistory } from '../store.js';
import { analyzeSearchHistory } from '../ai.js';

export const interestsRoutes = Router();

interestsRoutes.get('/interests', (req, res) => {
  const userId = req.query.userId || 'default';
  const data = getInterests(userId);
  res.json(data);
});

// Get analysis history
interestsRoutes.get('/interests/history', (req, res) => {
  const userId = req.query.userId || 'default';
  const history = getInterestsHistory(userId);
  res.json({ history });
});

interestsRoutes.post('/interests/analyze', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const history = getHistory(userId);
    const analysis = await analyzeSearchHistory(history);

    // Add timestamp and save to current
    const timestampedAnalysis = { ...analysis, timestamp: Date.now(), date: new Date().toISOString().split('T')[0] };
    setInterests(userId, timestampedAnalysis);

    // Save to history (one per day)
    addInterestsHistory(userId, timestampedAnalysis);

    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
