import { Router } from 'express';
import { getHistory, getMagazines, addMagazine } from '../store.js';
import { generateSundayMagazine } from '../ai.js';

export const magazineRoutes = Router();

// Get the user's generated magazines
magazineRoutes.get('/magazine', (req, res) => {
  const userId = req.query.userId || 'default';
  const magazines = getMagazines(userId);
  res.json({ magazines });
});

// Immediately force-generate a magazine for development/testing
magazineRoutes.post('/magazine/generate', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const history = getHistory(userId);
    
    // In production, we'd slice strictly by the last 7 days.
    // For now, we take recent history (up to 800 items).
    const magazineData = await generateSundayMagazine(history);
    
    if (!magazineData) {
      return res.status(400).json({ error: 'Not enough history to generate a magazine' });
    }

    const today = new Date();
    // Monday as start of weekly period
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1)).toISOString().split('T')[0];
    
    // Attach date and the generated picture URL (using pollinations.ai completely free proxy)
    const vibePrompt = magazineData.vibePrompt || 'Abstract colorful digital art';
    const encodedPrompt = encodeURIComponent(vibePrompt);
    
    const finalMagazine = {
      ...magazineData,
      weekStartDate: startOfWeek,
      vibeImageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=1000&nologo=true`
    };

    const updated = addMagazine(userId, finalMagazine);
    res.json({ success: true, magazines: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
