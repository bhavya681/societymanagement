import { MongoMemoryServer } from "mongodb-memory-server";
import path from "path";
import fs from "fs";

async function start() {
  const dbPath = path.resolve(__dirname, "../../.mongo-data");
  fs.mkdirSync(dbPath, { recursive: true });
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: "society-maintenance",
      dbPath,
      storageEngine: "wiredTiger",
    },
  });
  console.log(`Ephemeral MongoDB listening at ${mongod.getUri()}`);
  console.log("Leave this process running, then use npm run seed / npm run server in another terminal.");
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
