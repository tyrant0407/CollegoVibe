const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

// Connect to the database
mongoose.connect(process.env.DBURL)
  .then(() => console.log('Connected to the database'))
  .catch(err => console.error('Database connection error:', err));

// Define the user schema with validations and indexes
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: [true,'usernamealready taken'], trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: [true,'use different email'], trim: true, lowercase: true },
  password: { type: String }, // Password will be automatically hashed by passport-local-mongoose
  bio: { type: String, trim: true },
  profileImage: { type: String, default: 'userImage.webp' },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
  followings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  socketId: { type: String, trim: true }
}, { timestamps: true }); // Add timestamps for createdAt and updatedAt

// Apply the passport-local-mongoose plugin for secure password storage and authentication
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' }); // Use email as the username field

// Add indexes for frequent queries
userSchema.index({ username: 1 }); // Index for efficient querying by username
userSchema.index({ email: 1 }); // Index for efficient querying by email

// Implement error handling for database operations
userSchema.post('save', (error, doc, next) => {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Duplicate key error'));
  } else {
    next(error);
  }
});

// Compile the schema into a model
const User = mongoose.model('User', userSchema);

module.exports = User;
