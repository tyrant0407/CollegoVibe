const mongoose = require('mongoose');

// Define the story schema with validations and indexes
const storySchema = new mongoose.Schema({
  picture: { type: String, required: true },
  pictureId: { type: String }, // ImageKit file ID for the story image
  date: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true }
}, { timestamps: true });

// Add indexes for frequent queries
storySchema.index({ date: -1 }); // Index for sorting by date in descending order
storySchema.index({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

// Implement error handling for database operations
storySchema.post('save', (error, doc, next) => {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Duplicate key error'));
  } else {
    next(error);
  }
});



// Compile the schema into a model
const Story = mongoose.model('Storys', storySchema);

module.exports = Story;
