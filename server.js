import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import chalk from "chalk";

/* ------------------------- helpers ------------------------- */
const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------- app init ------------------------- */
const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? "*" : CORS_ORIGIN.split(",").map(s => s.trim()),
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(compression());
app.use(express.json({ limit: "1mb" }));

app.use("/api/rsvp", rateLimit({ windowMs: 60_000, max: 5 }));

/* ------------------------- 404 & errors ------------------------- */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* ------------------------- start ------------------------- */
async function start() {
  try {
    await mongoose.connect(MONGO_URL, {
      autoCreate: true,
      serverSelectionTimeoutMS: 8000,
    });
    console.log(chalk.yellow("✅ MongoDB connected"));
    app.listen(PORT, () => console.log(chalk.blue(`🚀 API on http://localhost:${PORT}`)));
  } catch (e) {
    console.error("Mongo connect failed:", e);
    process.exit(1);
  }
}

process.on("unhandledRejection", (e) => {
  console.error("unhandledRejection:", e);
});
process.on("uncaughtException", (e) => {
  console.error("uncaughtException:", e);
});

start();
