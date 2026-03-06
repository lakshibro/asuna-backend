import { Router } from 'express';
import { addHistory, getHistory } from '../store.js';
import { answerFromHistory } from '../ai.js';

export const historyRoutes = Router();

// Helper to detect heavy browsing sessions on a single topic
function detectProactiveTrigger(newItems) {
  if (newItems.length < 5) return null; // Need some volume
  
  // Very basic counting - replace with NLP/LLM topic extraction if desired later
  const keywords = newItems.map(i => i.title?.toLowerCase() || '').join(' ');
  
  // Basic heuristic: are they stuck on a bug or planning a trip?
  if (keywords.match(/stackoverflow|error|typeerror|exception|debug/g)?.length >= 4) {
    return { type: 'debugging', context: newItems.slice(0, 5).map(i => i.title).join(', ') };
  }
  if (keywords.match(/flight|hotel|booking|airbnb|trip|travel/g)?.length >= 4) {
    return { type: 'travel', context: newItems.slice(0, 5).map(i => i.title).join(', ') };
  }
  return null;
}

// Chrome extension sends history here
historyRoutes.post('/history/sync', async (req, res) => {
  const { userId = 'default', items = [] } = req.body;
  const merged = addHistory(userId, items);
  
  // Check for proactive triggers
  const trigger = detectProactiveTrigger(items);
  if (trigger) {
    console.log(`[Proactive] Trigger detected: ${trigger.type}`);
    try {
      // Assuming whatsapp-bot runs on 3847 locally
      await fetch('http://localhost:3847/api/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, trigger })
      });
    } catch(e) {
      console.error('[Proactive] Failed to trigger whatsapp bot:', e.message);
    }
  }

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
