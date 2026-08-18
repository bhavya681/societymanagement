import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env";

dns.setDefaultResultOrder("ipv4first");

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 20000,
    family: 4,
  });
  console.log("MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
