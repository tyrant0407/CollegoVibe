const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const imagekit = require('../config/imagekit');

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Function to upload image to ImageKit
const uploadToImageKit = async (file, folder = 'uploads') => {
  try {
    const fileName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);

    const result = await imagekit.upload({
      file: file.buffer, // file buffer from multer memory storage
      fileName: fileName,
      folder: folder,
      useUniqueFileName: true,
      tags: ['collegovibe', folder]
    });

    return {
      url: result.url,
      fileId: result.fileId,
      name: result.name
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw new Error('Failed to upload image to cloud storage');
  }
};

// Function to delete image from ImageKit
const deleteFromImageKit = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
    return true;
  } catch (error) {
    console.error('ImageKit delete error:', error);
    return false;
  }
};

module.exports = {
  upload,
  uploadToImageKit,
  deleteFromImageKit
};
