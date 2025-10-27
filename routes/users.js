const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

// Connect to the database
mongoose.connect(process.env.DBURL)
  .then(() => console.log('Connected to the database'))
  .catch(err => console.error('Database connection error:', err));

// Define the user schema with validations and indexes
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Password will be automatically hashed by passport-local-mongoose
  bio: { type: String },
  profileImage: { type: String, default: 'userImage.webp' },
  profileImageId: { type: String }, // ImageKit file ID for profile image
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Posts' }],
  saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Posts' }],
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Storys' }],
  followings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  socketId: { type: String }
});

// Apply the passport-local-mongoose plugin for secure password storage and authentication
userSchema.plugin(passportLocalMongoose, {
  usernameUnique: true,
  usernameField: 'username', // Specify the username field for authentication
  passwordValidator: (password, cb) => {
    // Implement custom password validation if needed
    // Example: Check password strength, length, etc.
    cb();
  }
});

// Add indexes for frequent queries
userSchema.index({ username: 1 }); // Index for efficient querying by username

// Implement error handling for database operations
userSchema.post('save', (error, doc, next) => {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Duplicate key error'));
  } else {
    next(error);
  }
});

// Compile the schema into a model
const User = mongoose.model('Users', userSchema);

module.exports = User;
