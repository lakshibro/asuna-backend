import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';

// File persistence
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const STORE_FILE = path.join(DATA_DIR, 'store.json');

export const store = new NodeCache({ stdTTL: 86400 * 7 }); // 7 days

// Load from file on start
try {
  if (fs.existsSync(STORE_FILE)) {
    const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    Object.keys(data).forEach(key => store.set(key, data[key]));
    console.log('Loaded store from file');
  }
} catch (e) {
  console.error('Failed to load store:', e);
}

function saveStore() {
  try {
    const keys = store.keys();
    const data = {};
    keys.forEach(key => data[key] = store.get(key));
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save store:', e);
  }
}

// Save periodically
setInterval(saveStore, 60 * 1000); // Every minute

export function getHistory(userId) {
  return store.get(`history:${userId}`) || [];
}

export function addHistory(userId, items) {
  const existing = getHistory(userId);
  const seen = new Set(existing.map(i => i.url + i.timestamp));
  const newItems = items.filter(i => !seen.has((i.url || '') + (i.timestamp || '')));
  const merged = [...existing, ...newItems].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 500);
  store.set(`history:${userId}`, merged);
  saveStore(); // Save immediately on sync
  return merged;
}

export function setHistory(userId, items) {
  store.set(`history:${userId}`, items);
  saveStore();
}

export function getDiary(userId) {
  return store.get(`diary:${userId}`) || { entries: [] };
}

export function setDiary(userId, diary) {
  store.set(`diary:${userId}`, diary);
  saveStore();
}

// Update specific diary entry by index or date
export function updateDiaryEntry(userId, id, newContent) {
  const diary = getDiary(userId);
  const index = parseInt(id);
  if (index >= 0 && index < diary.entries.length) {
    diary.entries[index].content = newContent;
    diary.entries[index].updatedAt = Date.now();
    setDiary(userId, diary);
    return diary.entries[index];
  }
  return null;
}

// Delete diary entry
export function deleteDiaryEntry(userId, id) {
  const diary = getDiary(userId);
  const index = parseInt(id);
  if (index >= 0 && index < diary.entries.length) {
    diary.entries.splice(index, 1);
    setDiary(userId, diary);
    return true;
  }
  return false;
}

export function getInterests(userId) {
  return store.get(`interests:${userId}`) || { interests: [], suggestions: [] };
}

export function setInterests(userId, data) {
  store.set(`interests:${userId}`, data);
  saveStore();
}

// Analysis history (one per day)
export function getInterestsHistory(userId) {
  return store.get(`interests_history:${userId}`) || [];
}

export function addInterestsHistory(userId, analysis) {
  const history = getInterestsHistory(userId);
  const date = analysis.date || new Date().toISOString().split('T')[0];

  // Remove existing entry for same day (keep one per day)
  const filtered = history.filter(h => h.date !== date);
  filtered.unshift(analysis);

  // Keep last 30 days
  const trimmed = filtered.slice(0, 30);
  store.set(`interests_history:${userId}`, trimmed);
  saveStore();
  return trimmed;
}
