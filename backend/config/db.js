const mongoose = require('mongoose');

// Global is used here to maintain a cached connection across hot reloads
// in development and serverless function invocations in production.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 15,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error(`MongoDB Connection Error: ${e.message}`);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;
