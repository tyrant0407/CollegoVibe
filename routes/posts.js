const mongoose = require('mongoose');

// Define the post schema with validations and indexes
const postSchema = new mongoose.Schema({
  caption: { type: String, required: false },
  picture: { type: String, required: true },
  date: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comments' }],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true }
});

// Add indexes for frequent queries
postSchema.index({ date: -1 }); // Index for sorting by date in descending order

// Implement error handling for database operations
postSchema.post('save', (error, doc, next) => {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Duplicate key error'));
  } else {
    next(error);
  }
});

// Define virtual properties for additional functionality if needed
// For example, a virtual property to get the total number of likes
postSchema.virtual('totalLikes').get(function() {
  return this.likes.length;
});

// Compile the schema into a model
const Post = mongoose.model('Posts', postSchema);

module.exports = Post;
