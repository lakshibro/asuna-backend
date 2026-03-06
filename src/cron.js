import cron from 'node-cron';
import { getHistory, addMagazine } from './store.js';
import { generateSundayMagazine } from './ai.js';

export function setupCronJobs() {
  // Run every Sunday at 08:00 AM
  cron.schedule('0 8 * * 0', async () => {
    console.log('[CRON] Starting Sunday Magazine Generation...');
    try {
      // In a real app we'd iterate over users, but since this is single user right now:
      const userId = 'default';
      const history = getHistory(userId);
      
      const magazineData = await generateSundayMagazine(history);
      if (!magazineData) {
        console.log('[CRON] Not enough history to generate magazine');
        return;
      }
      
      const today = new Date();
      // Calculate start of week (last Monday)
      const dateOffset = (today.getDay() === 0 ? 6 : today.getDay() - 1);
      const startOfWeek = new Date(today.setDate(today.getDate() - dateOffset)).toISOString().split('T')[0];
      
      const vibePrompt = magazineData.vibePrompt || 'Beautiful abstract scenery';
      const encodedPrompt = encodeURIComponent(vibePrompt);
      
      const finalMagazine = {
        ...magazineData,
        weekStartDate: startOfWeek,
        vibeImageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=1000&nologo=true`
      };

      addMagazine(userId, finalMagazine);
      console.log(`[CRON] Successfully generated and saved Sunday Magazine for week: ${startOfWeek}`);
    } catch (e) {
      console.error('[CRON] Failed to generate Sunday Magazine:', e.message);
    }
  });
  
  console.log('✅ Cron jobs initialized.');
}
