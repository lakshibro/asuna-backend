import { Router } from 'express';
import { getHistory, getInterests, setInterests } from '../store.js';
import { analyzeSearchHistory } from '../ai.js';

export const interestsRoutes = Router();

interestsRoutes.get('/interests', (req, res) => {
  const userId = req.query.userId || 'default';
  const data = getInterests(userId);
  res.json(data);
});

interestsRoutes.post('/interests/analyze', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const history = getHistory(userId);
    const analysis = await analyzeSearchHistory(history);
    setInterests(userId, analysis);
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
