const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');

require('dotenv').config();

const setupAdmins = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    const upgradeResult = await Admin.updateMany(
      { role: { $ne: 'superadmin' } }, 
      { $set: { role: 'superadmin' } }
    );
    console.log(`Upgraded ${upgradeResult.modifiedCount} existing admins to superadmin.`);

    const email = 'mbinnasiralmahmood@gmail.com';
    const password = 'admin@bql';

    const existingMentor = await Admin.findOne({ email });
    if (existingMentor) {
      console.log('Mentor admin already exists.');
    } else {
      await Admin.create({
        email,
        password,
        role: 'admin'
      });
      console.log(`Created new mentor admin: ${email}`);
    }

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

setupAdmins();
