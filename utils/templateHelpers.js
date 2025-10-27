const { getOptimizedImageUrl, getThumbnailUrl, getProfileImageUrl } = require('./imageUtils');

// Helper function to get the correct image URL (local or ImageKit)
const getImageUrl = (imagePath, type = 'default') => {
    if (!imagePath) {
        return '/images/userImage.webp'; // Default image
    }

    // If it's already a full URL (ImageKit), return as is or with optimizations
    if (imagePath.startsWith('http')) {
        switch (type) {
            case 'profile':
                return getProfileImageUrl(imagePath);
            case 'thumbnail':
                return getThumbnailUrl(imagePath);
            default:
                return getOptimizedImageUrl(imagePath);
        }
    }

    // If it's a local path, return with /images/uploads/ prefix
    return `/images/uploads/${imagePath}`;
};

module.exports = {
    getImageUrl
};