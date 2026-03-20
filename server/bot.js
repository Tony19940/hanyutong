import { Bot } from 'grammy';

export function setupBot(token, webappUrl) {
  if (!token || token === 'your_telegram_bot_token_here') {
    console.log('⚠️  No BOT_TOKEN set, skipping Telegram bot setup');
    return null;
  }

  const bot = new Bot(token);

  // Set the menu button to open the Web App directly
  bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: '📖 បើក汉语通',
      web_app: { url: webappUrl }
    }
  }).then(() => {
    console.log('✅ Menu button set to Web App');
  }).catch((err) => {
    console.warn('⚠️  Failed to set menu button:', err.message);
  });

  bot.command('start', async (ctx) => {
    await ctx.reply(
      'សួស្តី! 🎉 សូមស្វាគមន៍មកកាន់ ហានយីតុង 汉语通!\n\n' +
      '📖 ចុចប៊ូតុង "📖 បើក汉语通" នៅខាងក្រោមឆ្វេង ឬចុចប៊ូតុងខាងក្រោមដើម្បីចាប់ផ្ដើមរៀន',
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '📖 បើក汉语通 · 打开汉语通',
              web_app: { url: webappUrl }
            }
          ]]
        }
      }
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '📖 ហានយីតុង 汉语通 - ជំនួយ\n\n' +
      '🔑 អ្នកត្រូវការលេខសម្ងាត់ដើម្បីចូលប្រើ\n' +
      '📱 ទំនាក់ទំនងទិញលេខសម្ងាត់: @sotheary92\n\n' +
      'ចុច /start ដើម្បីបើកកម្មវិធី'
    );
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  bot.start();
  console.log('🤖 Telegram bot started');

  return bot;
}
