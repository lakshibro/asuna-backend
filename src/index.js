import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { diaryRoutes } from './routes/diary.js';
import { interestsRoutes } from './routes/interests.js';
import { contentRoutes } from './routes/content.js';
import { historyRoutes } from './routes/history.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3848;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'asuna-backend', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api', diaryRoutes);
app.use('/api', interestsRoutes);
app.use('/api', contentRoutes);
app.use('/api', historyRoutes);

app.listen(port, '0.0.0.0', () => {
  console.log(`Asuna Backend running on http://0.0.0.0:${port}`);
});
