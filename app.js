require('dotenv').config()
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const expressSession = require('express-session');
const passport = require('passport');
const logger = require('./utils/logger');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var imagekitAuthRouter = require('./routes/imagekit-auth');
const { getImageUrl } = require('./utils/templateHelpers');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Make helper functions available in all templates
app.locals.getImageUrl = getImageUrl;

app.use(expressSession({
  saveUninitialized: false,
  resave: false,
  secret: 'helllyoo'
}))
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(usersRouter.serializeUser());
passport.deserializeUser(usersRouter.deserializeUser());

// Enhanced Morgan logging with different formats for different environments
const morganFormat = process.env.NODE_ENV === 'production'
  ? 'combined'
  : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.http(message.trim());
    }
  },
  skip: (req, res) => {
    // Skip logging for static files and health checks
    return req.url.startsWith('/images') ||
      req.url.startsWith('/stylesheets') ||
      req.url.startsWith('/javascripts') ||
      req.url === '/health';
  }
}));

// Log errors with Morgan
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.error(message.trim());
    }
  },
  skip: (req, res) => res.statusCode < 400
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/imagekit', imagekitAuthRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = createError(404);
  logger.warn('404 Not Found:', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next(err);
});

// Enhanced error handler
app.use((err, req, res, next) => {
  // Set default error status
  err.status = err.status || err.statusCode || 500;

  // Log error with context
  const errorContext = {
    message: err.message,
    status: err.status,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : 'anonymous',
    timestamp: new Date().toISOString()
  };

  // Log based on error severity
  if (err.status >= 500) {
    logger.error('Server Error:', { ...errorContext, stack: err.stack });
  } else if (err.status >= 400) {
    logger.warn('Client Error:', errorContext);
  } else {
    logger.info('Request Error:', errorContext);
  }

  // Don't expose stack traces in production
  const isDevelopment = req.app.get('env') === 'development';

  // Handle API requests differently
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(err.status).json({
      error: {
        message: err.message,
        status: err.status,
        ...(isDevelopment && { stack: err.stack })
      }
    });
  }

  // Handle different error types
  let userMessage = err.message;
  let redirectPath = null;

  switch (err.status) {
    case 400:
      userMessage = 'Invalid request. Please check your input.';
      break;
    case 401:
      userMessage = 'Please log in to continue.';
      redirectPath = '/login';
      break;
    case 403:
      userMessage = 'You don\'t have permission to access this resource.';
      break;
    case 404:
      userMessage = 'The page you\'re looking for doesn\'t exist.';
      break;
    case 413:
      userMessage = 'File too large. Please choose a smaller file.';
      break;
    case 429:
      userMessage = 'Too many requests. Please try again later.';
      break;
    case 500:
    default:
      userMessage = 'Something went wrong. Please try again later.';
      break;
  }

  // Redirect for authentication errors
  if (redirectPath && !req.xhr) {
    return res.redirect(redirectPath);
  }

  // Render error page
  res.status(err.status);
  res.render('error', {
    message: userMessage,
    error: isDevelopment ? err : {},
    footer: false,
    status: err.status
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason,
    promise
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  });

  // Exit process on uncaught exception
  process.exit(1);
});

module.exports = app;
