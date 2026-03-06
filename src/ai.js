
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
      console.log(`Generating diary for ${date}. Items: ${items.length}`);
      if (items.length > 0) {
        console.log(`Time range: ${new Date(items[items.length - 1].lastVisitTime).toLocaleTimeString()} -> ${new Date(items[0].lastVisitTime).toLocaleTimeString()}`);
      }

      // formatting: [HH:MM] Title (URL)
      // formatting: [HH:MM] Title (URL)
      const dayItems = items.slice(0, 500).reverse().map(i => {
        const time = i.lastVisitTime ? new Date(i.lastVisitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `[${time}] ${i.title || 'Unknown Page'} (${i.url})`;
      }).join('\n');
      return `Date: ${date}\nActivity Log:\n${dayItems}`;
    }).join('\n\n');

    const availableDates = daysToProcess.map(([d]) => d).join(', ');

    let systemPrompt = `You are writing a personal and natural diary entry for the user based on their browsing history.
    
    INPUT DATA:
    You are provided with a chronological log of the user's browser history for a specific day ("Activity Log").
    The log includes timestamps ([HH:MM]). Use these to understand the flow of the day, gaps in activity, and habits.
    
    INSTRUCTIONS:
    1. Write a SINGLE, cohesive diary entry for the date: ${availableDates}.
    2. Style: Natural, conversational, and introspective. Write like a real person documenting their day-to-day life. Avoid making it overly dramatic or robotic.
    3. Connect the dots: If the user searched for "coding tutorials" then "youtube music", maybe they were studying with music.
    4. You can be mildly judgmental or funny if it fits the searches (e.g., searching for the same basic programming question 5 times).
    
    IMPORTANT CONSTRAINTS:
    - Only generate an entry for ${availableDates}.
    - Do NOT mention "I saw in the logs" or "Based on your search history". Pretend YOU are the user living this day.
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

export async function answerFromHistory(history, query) {
  try {
    const model = getAI();
    if (!history || history.length === 0) {
      return "I don't have any browsing history to search through yet. Make sure your Asuna Chrome Extension is connected!";
    }

    // Limit to 100 items for context size, using titles and URLs
    const items = history.slice(0, 100);
    const text = items.map(h => {
        const timeStr = h.lastVisitTime ? new Date(h.lastVisitTime).toLocaleString() : '';
        return `[${timeStr}] ${h.title || 'Unknown Page'} (${h.url})`;
    }).join('\n');

    const systemPrompt = `You are Asuna, an AI assistant analyzing the user's browser history to answer their question.
    Keep your answer concise, helpful, and conversational. Do not list raw URLs unless they specifically ask for links.
    
    Browser History Snapshot (last 100 items):
    ${text}
    
    User Query: ${query}
    
    Response format: Plain text response answering the user's question directly. Keep it short.`;

    const result = await model.generateContent(systemPrompt);
    return result.response.text().trim();
  } catch (e) {
    console.error('History Answer Failed:', e.message);
    throw new Error(`Failed to query history: ${e.message}`);
  }
}
