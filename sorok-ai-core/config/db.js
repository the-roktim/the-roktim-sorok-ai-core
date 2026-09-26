import mongoose from "mongoose";
import { addLog } from "../utils/logger.js";

let isConnected = false;
let dbMode = "in-memory";

export async function connectDB() {
  const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoURI) {
    addLog("STARTUP", "MONGO_URI not specified. Activating SOROK AI In-Memory Governed Datastore (Mongoose compatible).");
    dbMode = "in-memory";
    isConnected = true;
    return { isConnected, mode: dbMode };
  }

  try {
    addLog("STARTUP", `Connecting to MongoDB database at ${mongoURI.split('@')[1] || 'localhost'}...`);
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 4000
    });
    isConnected = true;
    dbMode = "mongodb";
    addLog("STARTUP", `MongoDB connected successfully: ${conn.connection.host}`);
    return { isConnected, mode: dbMode };
  } catch (err) {
    addLog("WARN", `MongoDB connection failed: ${err.message}. Seamlessly falling back to In-Memory Governed Datastore.`);
    dbMode = "in-memory-fallback";
    isConnected = true;
    return { isConnected, mode: dbMode };
  }
}

export function getDBStatus() {
  return {
    connected: isConnected,
    mode: dbMode,
    readyState: mongoose.connection.readyState
  };
}
