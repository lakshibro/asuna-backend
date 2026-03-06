import { Router } from 'express';
import { addHistory, getHistory } from '../store.js';
import { answerFromHistory } from '../ai.js';

export const historyRoutes = Router();

// Chrome extension sends history here
historyRoutes.post('/history/sync', (req, res) => {
  const { userId = 'default', items = [] } = req.body;
  const merged = addHistory(userId, items);
  res.json({ ok: true, total: merged.length });
});

historyRoutes.get('/history', (req, res) => {
  const userId = req.query.userId || 'default';
  const history = getHistory(userId);
  res.json({ history });
});

historyRoutes.post('/history/query', async (req, res) => {
  try {
    const { userId = 'default', query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const history = getHistory(userId);
    const answer = await answerFromHistory(history, query);

    res.json({ answer });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
