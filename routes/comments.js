const mongoose = require('mongoose');

// Define the comment schema
const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users', // Reference to the Users model (matching your user model name)
        required: true
    },
    comment: {
        type: String,
        required: true,
        trim: true // Trim whitespace from the comment
    },
    replies: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users', // Reference to the Users model
            required: true
        },
        comment: {
            type: String,
            required: true,
            trim: true // Trim whitespace from the reply comment
        },
        replies: [this] // Nested replies, can go on recursively
    }],
    likes: [{
        type: String // Store usernames as strings to match your existing like system
    }],
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Add compound index for better query performance
commentSchema.index({ user: 1, createdAt: -1 });

// Define the Comment model with the correct name to match posts reference
const Comment = mongoose.model('Comments', commentSchema);

module.exports = Comment;
