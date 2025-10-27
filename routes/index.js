const express = require('express');
const router = express.Router();
const passport = require('passport')
const localStrategy = require('passport-local')
const userModel = require('./users.js');
const postModel = require('./posts.js');
const storyModel = require('./story.js');
const messageModel = require('./message.js');
const commentModel = require('./comments.js');
const { upload, uploadToImageKit } = require('./multer.js')
const { getOptimizedImageUrl, getThumbnailUrl, getProfileImageUrl } = require('../utils/imageUtils.js')
const { redirectWithToast, sendResponse, asyncHandler, validateRequiredFields, sanitizeInput } = require('../utils/responseHelpers.js')
const { name } = require('ejs');
const utils = require('./utils.js');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');


passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function (req, res) {
  res.render('index.ejs', { footer: false });
});

router.get('/login', function (req, res) {
  res.render('login.ejs', { footer: false });
});

router.get('/feed', isLoggedIn, asyncHandler(async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user })
    .populate('followings')
    .populate('followers');

  if (!user) {
    logger.error('User not found in feed route', {
      username: req.session.passport.user
    });
    throw new Error('User not found');
  }

  const posts = await postModel.find().populate('user');
  const stories = await storyModel
    .find({ user: { $ne: user._id } })
    .populate('user');

  const postcopy = posts
    // .filter(post => post.user._id.toString() === user._id.toString() || user.followings.some(id => id.toString() === post.user._id.toString()))
    .map(post => ({ ...post.toObject(), duration: utils.getTimeDifferenceFromNow(new Date(post.date)) }));


  const obj = {};
  const newStories = stories
    // .filter(story => (story.user._id.toString() === user._id.toString() || user.followings.some(id => id.toString() === story.user._id.toString())))
    .filter(story => {
      if (!obj[story.user._id]) {
        obj[story.user._id] = " ";
        return true;
      } else {
        return false;
      }
    });



  const combinedArray = user.followings.concat(user.followers);

  const objectMap = new Map();

  // Iterate through the array of objects
  combinedArray.forEach(obj => {
    // If the ID is not in the map, add the object to the map
    if (!objectMap.has(obj._id.toString())) {
      objectMap.set(obj._id.toString(), obj);
    }
  });

  // Convert the map values back to an array
  const messageUserArray = Array.from(objectMap.values());


  res.render('feed.ejs', { footer: true, user, posts: postcopy, stories: newStories, messageUserArray });
}));

router.get('/savedPost', isLoggedIn, async function (req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user }).populate({
      path: 'saved',
      populate: {
        path: 'user',
        model: 'Users'
      }
    })
    res.render('savedPost.ejs', { footer: true, user, });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/delete/comment/:commentId', isLoggedIn, async function (req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user })
    var comment = await commentModel.findOne({ _id: req.params.commentId })

    if (!comment) {
      return res.status(404).send('Comment not found');
    }

    // Only allow user to delete their own comments
    if (comment.user.toString() !== user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    await commentModel.deleteOne({ _id: req.params.commentId })
    res.redirect('back')
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/changePassword', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  res.render('changePassword.ejs', { footer: true, user });
});

router.post('/changePassword', isLoggedIn, asyncHandler(async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user });

  if (!user) {
    logger.error('User not found during password change', { username: req.session.passport.user });
    return redirectWithToast(res, '/login', 'Please log in again', 'error');
  }

  // Validate required fields
  const validation = validateRequiredFields(req.body, ['currentPassword', 'newPassword']);
  if (!validation.isValid) {
    logger.warn('Password change validation failed', {
      userId: user._id,
      error: validation.message
    });
    return redirectWithToast(res, '/changePassword', validation.message, 'warning');
  }

  const { currentPassword, newPassword } = req.body;

  // Validate new password strength
  if (newPassword.length < 6) {
    return redirectWithToast(res, '/changePassword', 'New password must be at least 6 characters long', 'warning');
  }

  if (newPassword === currentPassword) {
    return redirectWithToast(res, '/changePassword', 'New password must be different from current password', 'warning');
  }

  try {
    // Use passport-local-mongoose changePassword method
    await user.changePassword(currentPassword, newPassword);

    logger.info('Password changed successfully', { userId: user._id });

    return redirectWithToast(res, '/profile', 'Password changed successfully! 🔒', 'success');

  } catch (changeError) {
    logger.warn('Password change failed', {
      userId: user._id,
      error: changeError.message
    });

    // Handle specific passport-local-mongoose errors
    if (changeError.name === 'IncorrectPasswordError') {
      return redirectWithToast(res, '/changePassword', 'Current password is incorrect', 'error');
    }

    return redirectWithToast(res, '/changePassword', 'Failed to change password. Please try again.', 'error');
  }
}));

router.get('/post/:postId', isLoggedIn, async function (req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user });
    var post = await postModel.findOne({ _id: req.params.postId }).populate('user')

    post.duration = utils.getTimeDifferenceFromNow(new Date(post.date))

    res.render('post.ejs', { footer: true, user, post });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/story/:userId', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  var storyUser = await userModel.findOne({ _id: req.params.userId }).populate('stories')
  if (storyUser.stories.length === 0) {
    res.redirect('/feed');
  } else {

    var stories = storyUser.stories.map(story => ({
      ...story.toObject(),
      duration: utils.getTimeDifferenceFromNow(new Date(story.date))
    }));

    var stories = stories.filter(async function (story) {
      if (story.duration[1] === 'd') {
        var ans = await storyModel.deleteOne({ _id: story._id })
        var index = storyUser.stories.indexOf(story._id)
        storyUser.stories.splice(index, 1)
        storyUser.save();
        return false;
      }
      else {
        return true;
      }
    })

    if (stories.length === 0) {
      res.redirect('/feed')
    }
    else {
      res.render('story.ejs', { footer: false, user, storyUser, stories })
    }
  }
});

router.get('/comment/:postId', isLoggedIn, async function (req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user })
    var post = await postModel.findOne({ _id: req.params.postId })

    if (!post) {
      return res.status(404).send('Post not found');
    }

    if (!(post.comments.length === 0)) {
      post = await postModel.findOne({ _id: req.params.postId }).populate({
        path: 'comments',
        populate: {
          path: 'user',
          model: 'Users'
        }
      })
    }

    res.render('comment.ejs', { footer: true, user, post })
  } catch (error) {
    console.error('Error loading comments:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/commentPost/:postId', isLoggedIn, async function (req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user })
    var post = await postModel.findOne({ _id: req.params.postId })

    if (!post) {
      return res.status(404).send('Post not found');
    }

    if (!req.body.newComment || req.body.newComment.trim() === '') {
      return res.redirect('back');
    }

    var newComment = await commentModel.create({
      user: user._id,
      comment: req.body.newComment.trim(),
    })

    post.comments.push(newComment._id)
    await post.save();

    res.redirect('back')
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/like/comment/:commentId', isLoggedIn, async function (req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user })
    var comment = await commentModel.findOne({ _id: req.params.commentId })

    if (!comment) {
      return res.status(404).send('Comment not found');
    }

    if (comment.likes.includes(user.username)) {
      comment.likes.splice(comment.likes.indexOf(user.username), 1)
    }
    else {
      comment.likes.push(user.username);
    }
    await comment.save()
    res.redirect('back');
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/like/:postId', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  var post = await postModel.findOne({ _id: req.params.postId })
  if (post.likes.includes(user._id)) {
    post.likes.splice(post.likes.indexOf(user._id), 1)
  }
  else {
    post.likes.push(user._id);
  }
  await post.save()
  res.json(post)
});

router.get('/save/:postId', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  if (user.saved.indexOf(req.params.postId) === -1) {
    user.saved.push(req.params.postId)
  }
  else {
    var index = user.saved.indexOf(req.params.postId)
    user.saved.splice(index, 1)
  }
  await user.save()
  res.json(user)
});

router.get('/profile', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user }).populate('posts')
  res.render('profile.ejs', { footer: true, user });
});

router.get('/profile/:id', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  var clickedUser = await userModel.findOne({ _id: req.params.id }).populate('posts')
  if (user._id.toString() === req.params.id) {
    res.redirect('/profile')
  }
  else {
    res.render('profile2.ejs', { footer: true, user, clickedUser });
  }
});

router.get('/follow/:id', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  var clickedUser = await userModel.findOne({ _id: req.params.id })
  if (clickedUser.followers.indexOf(user._id) === -1) {
    clickedUser.followers.push(user._id);
    user.followings.push(clickedUser._id);
  }
  else {
    clickedUser.followers.splice(clickedUser.followers.indexOf(user._id), 1);
    user.followings.splice(user.followings.indexOf(clickedUser._id), 1);
  }
  await user.save()
  await clickedUser.save()
  res.redirect('back');
});

router.get('/search', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  res.render('search.ejs', { footer: true, user });
});

router.get('/search/:username', isLoggedIn, async function (req, res) {
  var regex = new RegExp(`^${req.params.username}`)
  var users = await userModel.find({ username: regex })
  res.json(users)
});

router.get('/edit', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  res.render('edit.ejs', { footer: true, user });
});

router.post('/update', isLoggedIn, upload.single('image'), asyncHandler(async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user });

  if (!user) {
    logger.error('User not found during profile update', { username: req.session.passport.user });
    return redirectWithToast(res, '/login', 'Please log in again', 'error');
  }

  // Validate required fields
  const validation = validateRequiredFields(req.body, ['username', 'name']);
  if (!validation.isValid) {
    logger.warn('Profile update validation failed', {
      userId: user._id,
      error: validation.message
    });
    return redirectWithToast(res, '/edit', validation.message, 'warning');
  }

  // Sanitize inputs
  const newUsername = sanitizeInput(req.body.username);
  const newName = sanitizeInput(req.body.name);
  const newBio = sanitizeInput(req.body.bio) || '';

  // Validate username format
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(newUsername)) {
    return redirectWithToast(res, '/edit', 'Username must be 3-20 characters and contain only letters, numbers, and underscores', 'warning');
  }

  // Check if username is already taken (if changed)
  if (newUsername !== user.username) {
    const existingUser = await userModel.findOne({ username: newUsername });
    if (existingUser) {
      logger.warn('Username already taken during update', {
        userId: user._id,
        attemptedUsername: newUsername
      });
      return redirectWithToast(res, '/edit', 'Username is already taken', 'warning');
    }
  }

  try {
    // Update basic info
    user.username = newUsername;
    user.name = newName;
    user.bio = newBio;

    // Handle profile image upload
    if (req.file) {
      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return redirectWithToast(res, '/edit', 'Please upload a valid image file', 'error');
      }

      try {
        const uploadResult = await uploadToImageKit(req.file, 'profiles');
        user.profileImage = uploadResult.url;
        user.profileImageId = uploadResult.fileId;

        logger.info('Profile image updated', {
          userId: user._id,
          imageUrl: uploadResult.url
        });
      } catch (uploadError) {
        logger.error('Error uploading profile image', {
          error: uploadError.message,
          userId: user._id
        });
        return redirectWithToast(res, '/edit', 'Failed to upload profile image. Please try again.', 'error');
      }
    }

    // Update session username if changed
    req.session.passport.user = user.username;

    await user.save();

    logger.info('Profile updated successfully', {
      userId: user._id,
      username: user.username
    });

    return redirectWithToast(res, '/profile', 'Profile updated successfully! ✅', 'success');

  } catch (saveError) {
    logger.error('Error saving profile updates', {
      error: saveError.message,
      stack: saveError.stack,
      userId: user._id
    });

    // Handle duplicate key error
    if (saveError.code === 11000) {
      return redirectWithToast(res, '/edit', 'Username or email is already taken', 'error');
    }

    return redirectWithToast(res, '/edit', 'Failed to update profile. Please try again.', 'error');
  }
}));

router.get('/upload', isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  res.render('upload.ejs', { footer: true, user });
});

router.post('/upload', isLoggedIn, upload.single("image"), asyncHandler(async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user });

  if (!user) {
    logger.error('User not found during upload', { username: req.session.passport.user });
    return redirectWithToast(res, '/login', 'Please log in again', 'error');
  }

  // Validate file upload
  if (!req.file) {
    logger.warn('Upload attempted without file', { userId: user._id });
    return redirectWithToast(res, '/upload', 'Please select an image to upload', 'warning');
  }

  // Validate category
  const category = sanitizeInput(req.body.catagory);
  if (!category || !['post', 'story'].includes(category)) {
    logger.warn('Invalid upload category', { category, userId: user._id });
    return redirectWithToast(res, '/upload', 'Please select a valid category', 'warning');
  }

  // Validate file type
  if (!req.file.mimetype.startsWith('image/')) {
    logger.warn('Invalid file type uploaded', {
      mimetype: req.file.mimetype,
      userId: user._id
    });
    return redirectWithToast(res, '/upload', 'Please upload a valid image file', 'error');
  }

  try {
    if (category === 'post') {
      // Upload image to ImageKit
      const uploadResult = await uploadToImageKit(req.file, 'posts');

      const caption = sanitizeInput(req.body.caption) || '';

      const newPost = await postModel.create({
        picture: uploadResult.url,
        pictureId: uploadResult.fileId,
        caption: caption,
        user: user._id
      });

      user.posts.push(newPost._id);
      await user.save();

      logger.info('Post uploaded successfully', {
        postId: newPost._id,
        userId: user._id,
        imageUrl: uploadResult.url
      });

      return redirectWithToast(res, '/feed', 'Post uploaded successfully! 🎉', 'success');

    } else if (category === 'story') {
      // Upload image to ImageKit
      const uploadResult = await uploadToImageKit(req.file, 'stories');

      const newStory = await storyModel.create({
        picture: uploadResult.url,
        pictureId: uploadResult.fileId,
        user: user._id
      });

      user.stories.push(newStory._id);
      await user.save();

      // Auto-delete story after 24 hours
      setTimeout(async () => {
        try {
          await storyModel.findByIdAndDelete(newStory._id);
          const updatedUser = await userModel.findById(user._id);
          if (updatedUser) {
            const index = updatedUser.stories.indexOf(newStory._id);
            if (index > -1) {
              updatedUser.stories.splice(index, 1);
              await updatedUser.save();
            }
          }
          logger.info('Story auto-deleted after 24 hours', { storyId: newStory._id });
        } catch (error) {
          logger.error('Error auto-deleting story', {
            storyId: newStory._id,
            error: error.message
          });
        }
      }, 24 * 60 * 60 * 1000); // 24 hours

      logger.info('Story uploaded successfully', {
        storyId: newStory._id,
        userId: user._id,
        imageUrl: uploadResult.url
      });

      return redirectWithToast(res, '/feed', 'Story uploaded successfully! ✨', 'success');
    }

  } catch (uploadError) {
    logger.error('Error during upload process', {
      error: uploadError.message,
      stack: uploadError.stack,
      userId: user._id,
      category: category,
      fileName: req.file.originalname
    });

    // Handle specific ImageKit errors
    if (uploadError.message.includes('ImageKit')) {
      return redirectWithToast(res, '/upload', 'Image upload service is temporarily unavailable. Please try again.', 'error');
    }

    return redirectWithToast(res, '/upload', 'Failed to upload image. Please try again.', 'error');
  }
}));

router.get('/messageList', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('followings').populate('followers')

  const combinedArray = user.followings.concat(user.followers);

  const objectMap = new Map();

  // Iterate through the array of objects
  combinedArray.forEach(obj => {
    // If the ID is not in the map, add the object to the map
    if (!objectMap.has(obj._id.toString())) {
      objectMap.set(obj._id.toString(), obj);
    }
  });

  // Convert the map values back to an array
  const messageUserArray = Array.from(objectMap.values());

  res.render('messageUsers.ejs', { footer: false, user, messageUserArray });
});

router.get('/message/:oppositeUserId', isLoggedIn, async function (req, res) {

  const user = await userModel.findOne({ username: req.session.passport.user }).populate('followings').populate('followers')
  const oppositeUser = await userModel.findOne({ _id: req.params.oppositeUserId })

  res.render('chat.ejs', { footer: false, user, oppositeUser });
});

router.get('/getMessage/:oppositeUserId', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('followings').populate('followers')
  const oppositeUser = await userModel.findOne({ username: req.params.oppositeUserId })

  const messages = await messageModel.find({
    $or: [
      {
        sender: user.username,
        receiver: oppositeUser.username
      },
      {
        receiver: user.username,
        sender: oppositeUser.username
      },
    ]
  })

  res.json(messages)

})
// Register route
router.post("/register", asyncHandler(async (req, res) => {
  // Validate required fields
  const validation = validateRequiredFields(req.body, ['username', 'name', 'email', 'password']);
  if (!validation.isValid) {
    logger.warn('Registration validation failed', { error: validation.message });
    return redirectWithToast(res, '/', validation.message, 'warning');
  }

  // Sanitize inputs
  const username = sanitizeInput(req.body.username);
  const name = sanitizeInput(req.body.name);
  const email = sanitizeInput(req.body.email.toLowerCase());
  const password = req.body.password;

  // Validate input formats
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return redirectWithToast(res, '/', 'Username must be 3-20 characters and contain only letters, numbers, and underscores', 'warning');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return redirectWithToast(res, '/', 'Please enter a valid email address', 'warning');
  }

  if (password.length < 6) {
    return redirectWithToast(res, '/', 'Password must be at least 6 characters long', 'warning');
  }

  try {
    // Create a new user
    const newUser = new userModel({ username, name, email });

    // Register user with passport-local-mongoose
    const registeredUser = await new Promise((resolve, reject) => {
      userModel.register(newUser, password, (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });

    // Authenticate the user
    await new Promise((resolve, reject) => {
      passport.authenticate("local")(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.info('User registered successfully', {
      userId: registeredUser._id,
      username: registeredUser.username
    });

    return redirectWithToast(res, '/profile', 'Welcome to CollegoVibe! 🎉', 'success');

  } catch (registerError) {
    logger.error('Registration failed', {
      error: registerError.message,
      username: username,
      email: email
    });

    // Handle specific errors
    if (registerError.name === 'UserExistsError') {
      return redirectWithToast(res, '/', 'Username is already taken', 'error');
    }

    if (registerError.code === 11000) {
      const field = registerError.message.includes('email') ? 'email' : 'username';
      return redirectWithToast(res, '/', `This ${field} is already registered`, 'error');
    }

    return redirectWithToast(res, '/', 'Registration failed. Please try again.', 'error');
  }
}));

// Login route
router.post('/login', asyncHandler(async (req, res, next) => {
  // Validate required fields
  const validation = validateRequiredFields(req.body, ['username', 'password']);
  if (!validation.isValid) {
    logger.warn('Login validation failed', { error: validation.message });
    return redirectWithToast(res, '/login', validation.message, 'warning');
  }

  const username = sanitizeInput(req.body.username);
  const password = req.body.password;

  // Custom passport authentication with better error handling
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      logger.error('Login authentication error', {
        error: err.message,
        username: username
      });
      return redirectWithToast(res, '/login', 'Login failed. Please try again.', 'error');
    }

    if (!user) {
      logger.warn('Login failed - invalid credentials', {
        username: username,
        info: info?.message
      });
      return redirectWithToast(res, '/login', 'Invalid username or password', 'error');
    }

    // Log the user in
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.error('Login session error', {
          error: loginErr.message,
          userId: user._id
        });
        return redirectWithToast(res, '/login', 'Login failed. Please try again.', 'error');
      }

      logger.info('User logged in successfully', {
        userId: user._id,
        username: user.username
      });

      return redirectWithToast(res, '/feed', `Welcome back, ${user.name}! 👋`, 'success');
    });
  })(req, res, next);
}));

router.get('/logout', (req, res) => {
  const username = req.user ? req.user.username : 'unknown';

  req.logout(function (err) {
    if (err) {
      logger.error('Logout error', { error: err.message, username });
      return redirectWithToast(res, '/feed', 'Error logging out. Please try again.', 'error');
    }

    logger.info('User logged out successfully', { username });
    return redirectWithToast(res, '/login', 'You have been logged out successfully', 'info');
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = router;
