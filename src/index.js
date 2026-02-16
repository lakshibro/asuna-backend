import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { diaryRoutes } from './routes/diary.js';
import { interestsRoutes } from './routes/interests.js';
import { contentRoutes } from './routes/content.js';
import { historyRoutes } from './routes/history.js';
import { imageRoutes } from './routes/images.js';
import { store } from './store.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3848;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health - Detailed check for persistence verification
app.get('/api/health', (req, res) => {
  const keys = store.keys();
  const historyKeys = keys.filter(k => k.startsWith('history:')).length;
  const interestsKeys = keys.filter(k => k.startsWith('interests:')).length;
  res.json({
    ok: true,
    service: 'asuna-backend',
    timestamp: new Date().toISOString(),
    storage: {
      totalKeys: keys.length,
      usersWithHistory: historyKeys,
      usersWithInterests: interestsKeys,
      storeFile: 'data/store.json'
    }
  });
});

// Mount routes
app.use('/api', diaryRoutes);
app.use('/api', interestsRoutes);
app.use('/api', contentRoutes);
app.use('/api', historyRoutes);
app.use('/api/images', imageRoutes);

app.listen(port, '0.0.0.0', () => {
  console.log(`Asuna Backend running on http://0.0.0.0:${port}`);
});
