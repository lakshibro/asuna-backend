import { Router } from 'express';
import { getHistory, getDiary, setDiary } from '../store.js';
import { generateDiary } from '../ai.js';

export const diaryRoutes = Router();

function groupByDay(history) {
  const byDay = {};
  for (const item of history) {
    const ts = item.timestamp || Date.now();
    const date = new Date(ts).toISOString().split('T')[0];
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(item);
  }
  return byDay;
}

diaryRoutes.get('/diary', (req, res) => {
  const userId = req.query.userId || 'default';
  const diary = getDiary(userId);
  res.json(diary);
});

diaryRoutes.post('/diary/generate', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const history = getHistory(userId);
    const byDay = groupByDay(history);
    const diary = await generateDiary(byDay);
    setDiary(userId, diary);
    res.json(diary);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
