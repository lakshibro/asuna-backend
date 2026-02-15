import NodeCache from 'node-cache';

export const store = new NodeCache({ stdTTL: 86400 * 7 }); // 7 days

export function getHistory(userId) {
  return store.get(`history:${userId}`) || [];
}

export function addHistory(userId, items) {
  const existing = getHistory(userId);
  const seen = new Set(existing.map(i => i.url + i.timestamp));
  const newItems = items.filter(i => !seen.has((i.url || '') + (i.timestamp || '')));
  const merged = [...existing, ...newItems].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 500);
  store.set(`history:${userId}`, merged);
  return merged;
}

export function setHistory(userId, items) {
  store.set(`history:${userId}`, items);
}

export function getDiary(userId) {
  return store.get(`diary:${userId}`) || { entries: [] };
}

export function setDiary(userId, diary) {
  store.set(`diary:${userId}`, diary);
}

export function getInterests(userId) {
  return store.get(`interests:${userId}`) || { interests: [], suggestions: [] };
}

export function setInterests(userId, data) {
  store.set(`interests:${userId}`, data);
}
