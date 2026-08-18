import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: required("MONGODB_URI", "mongodb://localhost:27017/society-maintenance"),
  jwtSecret: required("JWT_SECRET", "change_this_secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  isProd: (process.env.NODE_ENV ?? "development") === "production",
};
