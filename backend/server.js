require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/error');

const adminRoutes = require('./routes/adminRoutes');
const quizRoutes = require('./routes/quizRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();

// Connect to Database
connectDB();

// Middlewares
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://banoqabil-quiz-portal.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000'
].filter(Boolean).map(url => url.replace(/\/$/, ""));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Normalize incoming origin by removing trailing slash
    const normalizedOrigin = origin.replace(/\/$/, "");
    
    if (allowedOrigins.indexOf(normalizedOrigin) === -1) {
      console.log('CORS blocked for origin:', origin);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/student', studentRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Quiz Portal API is running...');
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

module.exports = app;
