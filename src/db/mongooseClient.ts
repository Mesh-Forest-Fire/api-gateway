import mongoose, { Connection } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let cachedConnection: Connection | null = null;

const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGODB_URI;

export async function connectMongoose(): Promise<Connection> {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!MONGODB_URL) {
    throw new Error("MONGODB_URL (or MONGODB_URI) is not set in the environment (.env)");
  }

  await mongoose.connect(MONGODB_URL);
  cachedConnection = mongoose.connection;

  return cachedConnection;
}

export function getMongooseConnection(): Connection {
  if (!cachedConnection) {
    throw new Error("Mongoose has not been initialized. Call connectMongoose() first.");
  }

  return cachedConnection;
}

export { mongoose };
