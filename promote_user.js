import mongoose from 'mongoose';

const uri = "mongodb+srv://mnchubs1911_db_user:I2byj1v8oRRhMIPL@cluster0.531jsnr.mongodb.net/test?appName=Cluster0";

async function promote() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'pawannayak59693@gmail.com' },
      { $set: { role: 'admin' } }
    );
    
    console.log('Modified count:', result.modifiedCount);
    if (result.modifiedCount > 0) {
      console.log('Successfully promoted pawannayak59693@gmail.com to admin!');
    } else {
      console.log('User not found or already admin.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

promote();
