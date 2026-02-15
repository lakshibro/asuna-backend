import { Router } from 'express';
import { addHistory, getHistory } from '../store.js';

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
