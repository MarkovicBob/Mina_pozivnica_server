import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { routes } from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { config } from "./config/env.js";

export function buildApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  const allowed = ["http://localhost:5173", "https://pozivnicamina.netlify.app"];
app.use(cors({
  origin: (origin, cb) => !origin || allowed.includes(origin) ? cb(null, true) : cb(new Error("Not allowed")),
}));
  app.use(morgan("dev"));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));

  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
