import { Composer, Context, Bot, Markup } from 'grammy';
import { MongoClient, MongoClientOptions } from 'mongodb';

const mongoClient = new MongoClient('mongodb+srv://bot:bot@cluster0.fi5r1kg.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true } as MongoClientOptions);
const db = mongoClient.db('telegram_bot_db');

const bot = new Bot<Context>('6907639979:AAGrkSC4hHBnaRSXUNL4kBeuqPEloTmhk_0');

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

// Stats command for admin
bot.command('stats', async (ctx: Context) => {
  const YOUR_ADMIN_ID = 123456789; // Replace with your admin's user ID
  if (ctx.from?.id === YOUR_ADMIN_ID) {
    const totalUsers = await db.collection('users').countDocuments({});
    const totalChats = await db.collection('chats').countDocuments({});
    const usersLast24Hours = await db.collection('users').countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const approvedRequests = await db.collection('requests').countDocuments({ status: 'approved' });

    const statsMessage = `
      Total Users: ${totalUsers}
      Total Chats: ${totalChats}
      Users in the last 24 hours: ${usersLast24Hours}
      Approved Requests: ${approvedRequests}
    `;
    await ctx.reply(statsMessage);
  }
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
      const welcomeMessage = `Hello [${ctx.from.first_name}](tg://user?id=${ctx.from.id}), your request to ${ctx.chat.title} has been accepted!`;
      await ctx.api.sendMessage(ctx.from.id, welcomeMessage, { parse_mode: 'Markdown' as ParseMode });

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
