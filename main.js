const { Grammy, session, Scenes, Markup } = require('grammy');
const { MongoClient } = require('mongodb');

// Set up MongoDB connection
const mongoClient = new MongoClient('mongodb+srv://bot:bot@cluster0.fi5r1kg.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoClient.db('telegram_bot_db');

// Initialize the bot
const bot = new Grammy('6907639979:AAGrkSC4hHBnaRSXUNL4kBeuqPEloTmhk_0');

// MongoDB cleanup on exit
process.on('SIGINT', async () => {
  await mongoClient.close();
  process.exit();
});

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply('Hello! I am your auto request bot.');
});

// Stats command for admin
bot.command('stats', async (ctx) => {
  if (ctx.from.id === 1496092965) {  // Replace YOUR_ADMIN_ID with your admin's user ID
    const totalUsers = await db.collection('users').countDocuments({});
    const totalChats = await db.collection('chats').countDocuments({});
    const usersLast24Hours = await db.collection('users').countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
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
bot.on('message', async (ctx) => {
  if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    // Approve user request
    await ctx.api.promoteChatMember(ctx.chat.id, ctx.from.id);
    
    // Save user info to MongoDB
    await db.collection('users').updateOne({ user_id: ctx.from.id }, { $set: { timestamp: new Date() } }, { upsert: true });

    // Send welcome message to the user
    const welcomeMessage = `Hello [${ctx.from.first_name}](tg://user?id=${ctx.from.id}), your request to ${ctx.chat.title} has been accepted!`;
    await ctx.api.sendMessage(ctx.from.id, welcomeMessage, { parse_mode: 'markdown' });

    // Update request status in MongoDB
    await db.collection('requests').updateOne(
      { user_id: ctx.from.id, chat_id: ctx.chat.id },
      { $set: { status: 'approved' } },
      { upsert: true }
    );
  }
});

// Start the bot
bot.start();
