const imagekit = require('../config/imagekit');

// Generate optimized image URL with transformations
const getOptimizedImageUrl = (imageUrl, transformations = {}) => {
    if (!imageUrl || !imageUrl.includes('ik.imagekit.io')) {
        return imageUrl; // Return original URL if not an ImageKit URL
    }

    const defaultTransformations = {
        quality: 80,
        format: 'auto',
        ...transformations
    };

    try {
        return imagekit.url({
            src: imageUrl,
            transformation: [defaultTransformations]
        });
    } catch (error) {
        console.error('Error generating optimized URL:', error);
        return imageUrl; // Return original URL on error
    }
};

// Generate thumbnail URL
const getThumbnailUrl = (imageUrl, width = 300, height = 300) => {
    return getOptimizedImageUrl(imageUrl, {
        width,
        height,
        crop: 'maintain_ratio',
        quality: 70
    });
};

// Generate profile image URL
const getProfileImageUrl = (imageUrl, size = 150) => {
    return getOptimizedImageUrl(imageUrl, {
        width: size,
        height: size,
        crop: 'maintain_ratio',
        quality: 80,
        radius: 'max' // Make it circular
    });
};

module.exports = {
    getOptimizedImageUrl,
    getThumbnailUrl,
    getProfileImageUrl
};