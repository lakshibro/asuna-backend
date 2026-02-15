import { Router } from 'express';
import { getHistory, getDiary, setDiary, updateDiaryEntry, deleteDiaryEntry } from '../store.js';
import { generateDiary, rewriteDiaryEntry } from '../ai.js';

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

// Update diary entry
diaryRoutes.put('/diary/:id', (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const updated = updateDiaryEntry(userId, id, content);
    if (!updated) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true, entry: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete diary entry
diaryRoutes.delete('/diary/:id', (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const { id } = req.params;

    const deleted = deleteDiaryEntry(userId, id);
    if (!deleted) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// AI rewrite entry
diaryRoutes.post('/diary/rewrite', async (req, res) => {
  try {
    const { content, prompt } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const rewritten = await rewriteDiaryEntry(content, prompt || 'Rewrite this diary entry to be more detailed and reflective');
    res.json({ content: rewritten });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
