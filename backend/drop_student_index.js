const mongoose = require('mongoose');
require('dotenv').config();
const Student = require('./models/Student');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  try {
    await Student.collection.dropIndex('studentId_1');
    console.log('Successfully dropped global unique index on studentId');
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Index already dropped or not found.');
    } else {
      console.error('Error dropping index:', err.message);
    }
  }
  
  // Re-create indexes based on schema
  await Student.syncIndexes();
  console.log('Indexes synced');
  
  process.exit();
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});
