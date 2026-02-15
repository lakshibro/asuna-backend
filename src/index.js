import { store } from './store.js';

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

app.listen(port, '0.0.0.0', () => {
  console.log(`Asuna Backend running on http://0.0.0.0:${port}`);
});
