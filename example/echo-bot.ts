import Bot from "../src/bot";
import {MessageHandler} from "../src/handler";

const TOKEN = process.env.BOT_VK_TEAMS_TOKEN;

const bot = new Bot({token: TOKEN})

const message_cb = async (payload) => {
  await bot.send_text(payload.chat.chatId, payload.text);
};

(async () => {
  bot.message_handler(new MessageHandler(null, message_cb).callback);
  await bot.start_polling();
  await bot.idle();
})();
