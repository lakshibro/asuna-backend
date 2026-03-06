import { Router } from 'express';
import { searchMemories, getVectorCount } from '../vectorStore.js';
import { createEmbedding } from '../ai.js';

export const recallRoutes = Router();

/**
 * POST /api/recall
 * Takes a query string, embeds it, searches the Second Brain vector store,
 * and returns the top matching memories.
 * 
 * Used by the WhatsApp bot to inject personal context into conversations.
 * 
 * Body: { query: string, topK?: number }
 * Returns: { memories: [{ text, date, score }], count: number }
 */
recallRoutes.post('/recall', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    const vectorCount = getVectorCount();
    if (vectorCount === 0) {
      return res.json({ memories: [], count: 0 });
    }

    // Embed the query and search
    const queryVector = await createEmbedding(query);
    const matches = searchMemories(queryVector, topK);

    // Only return memories with a reasonable similarity score (> 0.5)
    const relevant = matches
      .filter(m => m.score > 0.5)
      .map(m => ({
        text: m.text,
        date: m.metadata?.date || 'unknown',
        score: Math.round(m.score * 100) / 100
      }));

    res.json({ memories: relevant, count: vectorCount });
  } catch (e) {
    console.error('Recall endpoint error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
