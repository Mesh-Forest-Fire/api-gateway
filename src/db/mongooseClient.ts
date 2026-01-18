import mongoose, { Connection } from "mongoose";

let cachedConnection: Connection | null = null;

export interface MongooseConfig {
  uri: string;
}

export async function connectMongoose(config: MongooseConfig): Promise<Connection> {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!config.uri) {
    throw new Error("MONGODB connection URI is required");
  }

  await mongoose.connect(config.uri);
  cachedConnection = mongoose.connection;

  return cachedConnection;
}

export function getMongooseConnection(): Connection {
  if (!cachedConnection) {
    throw new Error("Mongoose has not been initialized. Call connectMongoose() first.");
  }

  return cachedConnection;
}
