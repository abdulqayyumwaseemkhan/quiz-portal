const mongoose = require('mongoose');

// Global is used here to maintain a cached connection across hot reloads
// in development and serverless function invocations in production.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10, // Optimize for serverless environments
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

  return cached.conn;
};

module.exports = connectDB;
