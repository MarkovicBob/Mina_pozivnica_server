import chalk from "chalk";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { buildApp } from "./app.js";

async function start() {
  try {
    await connectDB(config.mongoUrl);
    console.log(chalk.yellow("✅ MongoDB connected"));
    const app = buildApp();
    app.listen(config.port, () =>
      console.log(chalk.blue(`🚀 API on http://localhost:${config.port}`))
    );
  } catch (e) {
    console.error("Mongo connect failed:", e);
    process.exit(1);
  }
}

process.on("unhandledRejection", e => console.error("unhandledRejection:", e));
process.on("uncaughtException", e => console.error("uncaughtException:", e));

start();
