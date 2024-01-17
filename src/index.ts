import { Context, Grammy } from 'grammy';
import { MongoClient, MongoClientOptions } from 'mongodb';

const bot = new Grammy<Context>('6907639979:AAGrkSC4hHBnaRSXUNL4kBeuqPEloTmhk_0');
const mongoUri = 'mongodb+srv://bot:bot@cluster0.fi5r1kg.mongodb.net/?retryWrites=true&w=majority';

const mongoClient = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true } as MongoClientOptions);
const db = mongoClient.db('telegram_bot_db');

// MongoDB cleanup on exit
const cleanup = async () => {
  try {
    await mongoClient.close();
  } catch (error) {
    console.error('Error during MongoDB cleanup:', error);
  } finally {
    process.exit();
  }
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Start command
bot.command('start', async (ctx: Context) => {
  await ctx.reply('Hello! I am your auto request bot.');
});

// Group join handler
bot.on('message', async (ctx: Context) => {
  if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
    if (ctx.from) {
      // Approve user request
      await ctx.api.promoteChatMember(ctx.chat.id, ctx.from.id);

      // Save user info to MongoDB
      await db.collection('users').updateOne({ user_id: ctx.from.id }, { $set: { timestamp: new Date() } }, { upsert: true });

      // Send welcome message to the user
      const welcomeMessage = `Hello [${ctx.from.first_name}](tg://user?id=${ctx.from.id}), welcome to the group!`;
      await ctx.api.sendMessage(ctx.from.id, welcomeMessage, { parse_mode: 'Markdown' });

      // Update request status in MongoDB
      await db.collection('requests').updateOne(
        { user_id: ctx.from.id, chat_id: ctx.chat.id },
        { $set: { status: 'approved' } },
        { upsert: true }
      );
    }
  }
});

// Start the bot
bot.start();
