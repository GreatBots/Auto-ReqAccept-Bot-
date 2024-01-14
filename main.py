from pyrogram import Client, filters
from pyrogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from pymongo import MongoClient
from datetime import datetime, timedelta
import pymongo
import os
import atexit

# Set up your MongoDB connection
mongo_client = MongoClient("mongodb+srv://AABOT:AABOT@cluster0.xudaezc.mongodb.net/?retryWrites=true&w=majority")
db = mongo_client["telegram_bot_db"]

app = Client("auto_request_bot", api_id=int(os.environ["API_ID"]), api_hash=os.environ["API_HASH"], bot_token=os.environ["BOT_TOKEN"], workers=1)

@atexit.register
def cleanup():
    app.stop()  # Close the Pyrogram client
    mongo_client.close()  # Close the MongoDB client
    
# Define command handlers
@app.on_message(filters.command("start") & filters.private)
def start_command(client, message):
    message.reply_text("Hello! I am your auto request bot.")

@app.on_message(filters.command("stats") & filters.private)
def stats_command(client, message):
    if message.from_user.id == 6471032733:  # Replace YOUR_ADMIN_ID with your admin's user ID
        total_users = db.users.count_documents({})
        total_chats = db.chats.count_documents({})
        users_last_24_hours = db.users.count_documents({"timestamp": {"$gte": datetime.now() - timedelta(days=1)}})
        approved_requests = db.requests.count_documents({"status": "approved"})

        stats_message = (
            f"Total Users: {total_users}\n"
            f"Total Chats: {total_chats}\n"
            f"Users in the last 24 hours: {users_last_24_hours}\n"
            f"Approved Requests: {approved_requests}"
        )
        message.reply_text(stats_message)

# Define group join handler
@app.on_message(filters.group & filters.user(app.get_me().id) & ~filters.service)
def handle_group_join(client, message):
    user_id = message.from_user.id
    chat_id = message.chat.id
    chat_name = message.chat.title

    # Approve user request
    client.get_chat_member(chat_id, user_id).promote()

    # Save user info to MongoDB
    db.users.update_one({"user_id": user_id}, {"$set": {"timestamp": datetime.now()}}, upsert=True)

    # Send welcome message to the user
    welcome_message = f"Hello [{message.from_user.first_name}](tg://user?id={user_id}), your request to {chat_name} has been accepted!"
    client.send_message(user_id, welcome_message, disable_web_page_preview=True, parse_mode="markdown")

    # Update request status in MongoDB
    db.requests.update_one({"user_id": user_id, "chat_id": chat_id}, {"$set": {"status": "approved"}}, upsert=True)

# Define inline query handler
@app.on_inline_query()
def handle_inline_query(client, inline_query):
    # Provide total users count inline
    total_users = db.users.count_documents({})
    result = f"Total Users: {total_users}"
    inline_query.answer([InlineKeyboardButton("Stats", callback_data="stats")], cache_time=1, results=[{"type": "article", "id": "1", "title": "Stats", "input_message_content": {"message_text": result}}])

app.run()
