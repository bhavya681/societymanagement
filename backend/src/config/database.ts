import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env";

dns.setDefaultResultOrder("ipv4first");

const dnsServers =
  env.dnsServers?.length && env.dnsServers.length > 0
    ? env.dnsServers
    : undefined;

if (dnsServers) {
  dns.setServers(dnsServers);
  console.log(`MongoDB DNS servers configured: ${dnsServers.join(", ")}`);
}

let databaseConnected = false;

export function isDatabaseConnected(): boolean {
  return databaseConnected;
}

async function attemptConnect(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 20000,
    family: 4,
  });
  databaseConnected = true;
  console.log("MongoDB connected successfully");
}

export async function connectDatabase(): Promise<void> {
  const maxRetries = 5;
  const baseDelayMs = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await attemptConnect();
      return;
    } catch (error) {
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.error(
        `MongoDB connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`
      );

      if (attempt === maxRetries) {
        databaseConnected = false;
        console.error("MongoDB connection failed.");
        console.error("Check:");
        console.error("* MONGODB_URI");
        console.error("* MongoDB Atlas Network Access");
        console.error("* DNS configuration");
        console.error("* network connectivity");
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  databaseConnected = false;
}
