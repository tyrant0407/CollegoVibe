const mongoose = require('mongoose');

// Define the comment schema
const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
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
            ref: 'User', // Reference to the User model
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Reference to the User model
    }]
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Add compound index for better query performance
commentSchema.index({ user: 1, createdAt: -1 });

// Define the Comment model
const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
