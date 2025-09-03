import "dotenv/config";

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongoUrl: process.env.MONGO_URL,
  corsOrigin: (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
  adminToken: process.env.ADMIN_TOKEN || "",
};

if (!config.mongoUrl) {
  throw new Error("MONGO_URL nije definisan u .env");
}
