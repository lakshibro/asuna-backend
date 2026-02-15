import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
}

export async function analyzeSearchHistory(history) {
  const model = getAI();
  const text = history.slice(0, 50).map(h => `${h.url || ''} ${h.title || ''}`).join('\n');
  const prompt = `Analyze this user's Chrome/search history (first 50 entries). Return JSON only:
{
  "interests": ["topic1", "topic2", "topic3"],
  "suggestions": ["try X", "explore Y"],
  "diary_summary": "2-3 sentence reflection on their online activity today"
}
History:\n${text}`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { interests: [], suggestions: [], diary_summary: '' };
}

export async function generateDiary(historyByDay) {
  const model = getAI();
  const days = Object.entries(historyByDay).slice(0, 7);
  const text = days.map(([date, items]) => `${date}:\n${items.map(i => i.title || i.url).join('\n')}`).join('\n\n');
  const prompt = `Create a personal diary from this browsing/search history. Write 2-4 sentences per day, reflective and narrative. Return JSON:
{ "entries": [ { "date": "YYYY-MM-DD", "content": "..." } ] }

History:\n${text}`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { entries: [] };
}
