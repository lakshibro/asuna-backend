
import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest' });
}

// Wrap a promise with a timeout
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ]);
}

export async function analyzeSearchHistory(history) {
  try {
    const model = getAI();
    if (!history || history.length === 0) {
      console.log('Analysis skipped: No history data');
      return { interests: [], suggestions: ['Sync some history first!'], diary_summary: '' };
    }

    // Limit to 20 items, titles only (much faster)
    const items = history.slice(0, 20);
    const text = items.map(h => h.title || h.url || '').filter(Boolean).join('\n');
    console.log(`Analyzing ${items.length} of ${history.length} items...`);

    const prompt = `Analyze this browsing history. Return ONLY valid JSON, no markdown:
{"interests":["topic1","topic2","topic3"],"suggestions":["suggestion1","suggestion2"],"diary_summary":"2-3 sentence summary"}

History:
${text}`;

    const result = await withTimeout(model.generateContent(prompt), 15000);
    const raw = result.response.text();
    console.log('AI Response:', raw.substring(0, 100) + '...');

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { interests: [], suggestions: [], diary_summary: 'AI returned invalid format' };
  } catch (e) {
    console.error('AI Analysis Failed:', e.message);
    if (e.message.includes('429') || e.message.includes('Quota')) {
      throw new Error('AI Quota Exceeded. Please try again in a minute.');
    }
    if (e.message.includes('timed out')) {
      throw new Error('AI request timed out. The server may be busy — try again.');
    }
    throw new Error(`AI Error: ${e.message}`);
  }
}

export async function generateDiary(historyByDay) {
  try {
    const model = getAI();
    const days = Object.entries(historyByDay).slice(0, 5);
    const text = days.map(([date, items]) =>
      `${date}:\n${items.slice(0, 10).map(i => i.title || i.url).join('\n')}`
    ).join('\n\n');

    const prompt = `Create a personal diary from this browsing history. Write 2-3 sentences per day. Return ONLY valid JSON, no markdown:
{"entries":[{"date":"YYYY-MM-DD","content":"..."}]}

History:
${text}`;

    const result = await withTimeout(model.generateContent(prompt), 15000);
    const raw = result.response.text();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { entries: [] };
  } catch (e) {
    console.error('Diary Generation Failed:', e.message);
    if (e.message.includes('429') || e.message.includes('Quota')) {
      throw new Error('AI Quota Exceeded. Please try again later.');
    }
    return { entries: [] };
  }
}

// Rewrite diary entry with custom prompt
export async function rewriteDiaryEntry(content, customPrompt) {
  try {
    const model = getAI();
    const prompt = `${customPrompt}

Original entry:
${content}

Return ONLY the rewritten entry text, no JSON, no markdown:`;

    const result = await withTimeout(model.generateContent(prompt), 10000);
    const raw = result.response.text();
    return raw.trim();
  } catch (e) {
    console.error('Diary Rewrite Failed:', e.message);
    throw new Error(`Rewrite failed: ${e.message}`);
  }
}
