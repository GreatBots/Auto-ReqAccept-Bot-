from pyrogram import Client, filters
from pyrogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton
import pymongo
import os

app = Client(
    "My-Bot",
    bot_token=os.environ["BOT_TOKEN"],
    api_id=int(os.environ["API_ID"]),
    api_hash=os.environ["API_HASH"],
)

client = pymongo.MongoClient("mongodb+srv://AABOT:AABOT@cluster0.xudaezc.mongodb.net/?retryWrites=true&w=majority")
db = client["telegram_bot_db"]
requests_collection = db["join_requests"]

app.on_message(filters.command("start") & filters.private)
def start_command(_, message: Message):
    user_mention = message.from_user.mention
    welcome_message = f"Hello {user_mention}, Welcome to **Auto Request Accept Bot**! " \
                      "I'm here to effortlessly handle your channel join requests. " \
                      "Simply add me to your channel or group and grant **admin privileges**!"

    button_channel = InlineKeyboardButton("Channel", url="https://t.me/BotsXWorld")
    reply_markup = InlineKeyboardMarkup([[button_channel]])

    message.reply_text(welcome_message, reply_markup=reply_markup)

@app.on_message(filters.private & filters.command("stats", prefixes="/") & filters.user(6471032733))
async def stats_command(client, message):
    me = await app.get_me()
    total_users = me.dc_id
    total_chats = await app.get_chat_members_count(message.chat.id)
    total_users_24h = await app.get_online_members_count()
    total_approved_requests = get_total_approved_requests()
    await message.reply_text(f"Total Users: {total_users}\nTotal Chats: {total_chats}\nTotal Users in 24 Hours: {total_users_24h}\nTotal Approved Requests: {total_approved_requests}")

def get_total_approved_requests():
    total_approved_requests = requests_collection.count_documents({"status": "approved"})
    return total_approved_requests

@app.on_message(filters.new_chat_members)
async def new_chat_members(client, message):
    for member in message.new_chat_members:
        await member.promote()
        await member.send_message(f"Hello {member.mention}, your request to {message.chat.title} has been accepted.")

app.run()
