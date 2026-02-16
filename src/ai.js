
import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite' });
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

export async function generateDiary(historyByDay, context = {}) {
  try {
    const model = getAI();
    const today = new Date().toISOString().split('T')[0];

    let daysToProcess = [];

    // Logic: Only generate for the target date (context.date) OR Today.
    // We do NOT automatically regenerate past days anymore unless explicitly asked.
    const targetDate = context.date || today;

    if (historyByDay[targetDate]) {
      daysToProcess = [[targetDate, historyByDay[targetDate]]];
    } else {
      // If no history for today/target, maybe fallback to checking if there's *any* recent un-generated data?
      // For now, based on user request "only generate todays entry", we stick to targetDate.
      console.log(`No history found for ${targetDate}, skipping generation.`);
      return { entries: [] };
    }

    const text = daysToProcess.map(([date, items]) => {
      // Use ALL items (or a very large limit like 500)
      // formatting: [HH:MM] Title (URL)
      const dayItems = items.slice(0, 500).map(i => {
        const time = i.lastVisitTime ? new Date(i.lastVisitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `[${time}] ${i.title || 'Unknown Page'} (${i.url})`;
      }).join('\n');
      return `Date: ${date}\nActivity Log:\n${dayItems}`;
    }).join('\n\n');

    const availableDates = daysToProcess.map(([d]) => d).join(', ');

    let systemPrompt = `You are writing a deeply personal, detailed, and immersive diary entry for the user.
    
    INPUT DATA:
    You are provided with a chronological log of the user's browser history for a specific day ("Activity Log").
    The log includes timestamps ([HH:MM]). Use these to understand the flow of the day, gaps in activity, and late-night vs morning habits.
    
    INSTRUCTIONS:
    1. Write a SINGLE, VERY LONG, and comprehensive diary entry for the date: ${availableDates}.
    2. The entry must be at least 400-600 words long. Do not make it short.
    3. Style: Introspective, emotional, narrative, and "stream of consciousness". It should feel like a real person documenting their life, not a summary of searches.
    4. Connect the dots: If the user searched for "coding tutorials" then "youtube music", maybe they were studying with music. If they searched "late night delivery" at 2AM, comment on the late night.
    5. Be judgmental, funny, or deep based on the content.
    
    IMPORTANT CONSTRAINTS:
    - Only generate an entry for ${availableDates}.
    - Do NOT mention "I saw in the logs". Pretend YOU are the user living this day.
    - Return ONLY valid JSON.
    `;

    // Inject User Context
    if (context.mood || context.activity) {
      systemPrompt += `\n\nUSER CONTEXT (The user explicitly checked in with this):
      - Mood: ${context.mood}
      - Daily Highlights: ${context.activity}
      
      Integrate this deeply. If they felt "${context.mood}", the entire entry's tone should reflect that.`;
    }

    const prompt = `${systemPrompt}
    
    ${text}
    
    Output Format (JSON ONLY):
    {"entries":[{"date":"YYYY-MM-DD","content":"(Long markdown text here)"}]}`;

    // Extended timeout and token limit for larger generation
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { entries: [] };

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (e) {
    console.error('Diary Generation Failed:', e.message);
    if (e.message.includes('429')) return { entries: [] }; // Quota
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
