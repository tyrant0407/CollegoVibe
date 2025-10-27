const express = require('express');
const router = express.Router();
const imagekit = require('../config/imagekit');

// ImageKit authentication endpoint for client-side uploads
router.get('/auth', function (req, res) {
    try {
        const result = imagekit.getAuthenticationParameters();
        res.send(result);
    } catch (error) {
        console.error('ImageKit auth error:', error);
        res.status(500).send('Authentication failed');
    }
});

module.exports = router;