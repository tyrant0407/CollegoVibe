// Response helper functions for consistent error handling and user feedback

/**
 * Redirect with toast message
 * @param {Object} res - Express response object
 * @param {string} path - Redirect path
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 */
const redirectWithToast = (res, path, message, type = 'info') => {
    const url = new URL(path, 'http://localhost');
    url.searchParams.set('message', encodeURIComponent(message));
    url.searchParams.set('type', type);
    res.redirect(url.pathname + url.search);
};

/**
 * Send JSON response with consistent format
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Response message
 * @param {Object} data - Additional data
 * @param {boolean} success - Success flag
 */
const sendResponse = (res, status, message, data = null, success = true) => {
    res.status(status).json({
        success,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validate required fields
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - Validation result
 */
const validateRequiredFields = (body, requiredFields) => {
    const missing = [];
    const empty = [];

    requiredFields.forEach(field => {
        if (!(field in body)) {
            missing.push(field);
        } else if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
            empty.push(field);
        }
    });

    return {
        isValid: missing.length === 0 && empty.length === 0,
        missing,
        empty,
        message: missing.length > 0
            ? `Missing required fields: ${missing.join(', ')}`
            : empty.length > 0
                ? `Empty required fields: ${empty.join(', ')}`
                : null
    };
};

/**
 * Sanitize user input
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

module.exports = {
    redirectWithToast,
    sendResponse,
    asyncHandler,
    validateRequiredFields,
    sanitizeInput
};