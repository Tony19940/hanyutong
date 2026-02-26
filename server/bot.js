import { Bot } from 'grammy';

export function setupBot(token, webappUrl) {
  if (!token || token === 'your_telegram_bot_token_here') {
    console.log('⚠️  No BOT_TOKEN set, skipping Telegram bot setup');
    return null;
  }

  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    await ctx.reply(
      'សួស្តី! 🎉 សូមស្វាគមន៍មកកាន់ ហានយីតុង 汉语通!\n\n' +
      'ចុចប៊ូតុងខាងក្រោមដើម្បីចាប់ផ្ដើមរៀនភាសាចិន 📖',
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '📖 បើក汉语通',
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
      '📱 ទំនាក់ទំនងទិញលេខសម្ងាត់: @hanyutong_support\n\n' +
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
