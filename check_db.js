import mongoose from 'mongoose';

const uri = "mongodb+srv://mnchubs1911_db_user:I2byj1v8oRRhMIPL@cluster0.531jsnr.mongodb.net/test?appName=Cluster0";

async function checkDB() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // Get collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Count users
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    console.log('User count:', userCount);
    
    // Print all users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('Users:', users.map(u => ({ id: u._id, email: u.email, role: u.role, name: u.name })));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDB();
