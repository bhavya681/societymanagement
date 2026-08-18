import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function start() {
  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
