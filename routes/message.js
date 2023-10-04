const mongoose = require('mongoose');

// Define the message schema
const MessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  receiver: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  }
});

// Create indexes for efficient querying
MessageSchema.index({ sender: 1 });
MessageSchema.index({ receiver: 1 });

// Compile the schema into a model
const Message = mongoose.model('Message', MessageSchema);

// Export the Message model
module.exports = Message;
