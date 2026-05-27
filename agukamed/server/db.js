const mongoose = require('mongoose');

let connected = false;

async function connectDB() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[DB] MONGODB_URI not set — running in JSON fallback mode.');
    return;
  }
  try {
    await mongoose.connect(uri);
    connected = true;
    console.log('[DB] MongoDB connected.');
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    console.warn('[DB] Falling back to JSON data files.');
  }
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isConnected };
