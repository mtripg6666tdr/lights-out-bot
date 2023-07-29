import "dotenv/config";
import { LightsOutBot } from "./bot";

const bot = new LightsOutBot();

void bot.connect();

process.once("SIGINT", () => {
  bot.disconnect(false);
  console.log("Disconnecting...");
});
