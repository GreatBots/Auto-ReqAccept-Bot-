from pyrogram import Client, filters
from pyrogram.types import Message
import pymongo

# Initialize the pyrogram client
app = Client(
    "My-Bot",
    bot_token=os.environ["BOT_TOKEN"],
    api_id=int(os.environ["API_ID"]),
    api_hash=os.environ["API_HASH"],
)

client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["telegram_bot_db"]
requests_collection = db["join_requests"]

app.on_message(filters.command("start") & filters.private)
def start_command(_, message: Message):
    user_mention = message.from_user.mention
    welcome_message = f"Hello {user_mention}, Welcome to **Auto Request Accept Bot**! " \
                      "I'm here to effortlessly handle your channel join requests. " \
                      "Simply add me to your channel or group and grant **admin privileges**!"

    # Create a button with a URL
    button_channel = InlineKeyboardButton("Channel", url="https://t.me/BotsXWorld")
    reply_markup = InlineKeyboardMarkup([[button_channel]])

    message.reply_text(welcome_message, reply_markup=reply_markup)

# Function to handle the /stats command
@app.on_message(filters.private & filters.command("stats", prefixes="/") & filters.user(123456789))
async def stats_command(client, message):
    # Get the total users count
    total_users = await app.get_users_count()
    
    # Get the total chats count
    total_chats = await app.get_chat_count()
    
    # Get the total users in the last 24 hours count
    total_users_24h = await app.get_online_members_count()
    
    # Get the total approved requests status using pymongo
    total_approved_requests = get_total_approved_requests()
    
    # Send the statistics to the admin
    await message.reply_text(f"Total Users: {total_users}\nTotal Chats: {total_chats}\nTotal Users in 24 Hours: {total_users_24h}\nTotal Approved Requests: {total_approved_requests}")

def get_total_approved_requests():
    # Count the total approved requests in the MongoDB collection
    total_approved_requests = requests_collection.count_documents({"status": "approved"})
    return total_approved_requests

# Function to handle new chat members
@app.on_message(filters.new_chat_members)
async def new_chat_members(client, message):
    # Accept the request for all new chat members
    for member in message.new_chat_members:
        await member.promote()
        await member.send_message(f"Hello {member.mention}, your request to {message.chat.title} has been accepted.")

# Run the bot
app.run()
