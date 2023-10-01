const express = require('express');
const router = express.Router();
const passport = require('passport')
const localStrategy = require('passport-local')
const userModel = require('./users.js');
const postModel = require('./posts.js');
const storyModel = require('./story.js');
const messageModel = require('./message.js');
const commentModel = require('./comments.js');
const upload = require('./multer.js')
const { name } = require('ejs');
const utils = require('./utils.js');
const bcrypt = require('bcrypt');


passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res) {
  res.render('index.ejs', {footer: false});
});

router.get('/login', function(req, res) {
  res.render('login.ejs', {footer: false});
});

router.get('/feed', isLoggedIn, async function(req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user }).populate('followings').populate('followers')
    var posts = await postModel.find().populate('user')
    var stories = await storyModel.find({ user: { $ne: user._id } }).populate('user')

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


    res.render('feed.ejs', { footer: true, user, posts: postcopy, stories:newStories,messageUserArray });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/savedPost', isLoggedIn, async function(req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user }).populate({
      path: 'saved',
      populate: {
        path: 'user',
        model: 'Users'
      }
    })
    res.render('savedPost.ejs', { footer: true, user,});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/delete/comment/:commentId', isLoggedIn, async function(req, res) {
  await commentModel.deleteOne({_id:req.params.commentId})
  res.redirect('back')
});

router.get('/changePassword', isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user })
  res.render('changePassword.ejs',{footer:true,user});
});

router.post('/changePassword', isLoggedIn, async function(req, res) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Assuming you have a method like `user.changePassword` defined in your user model
    // This method should handle the password change securely (e.g., hashing the new password)
    await user.changePassword(req.body.currentPassword, req.body.newPassword);

    // Optionally, you can render a success message or redirect the user to another page
    res.redirect('/profile');
  } catch (error) {
    console.error('Error changing password:', error);
    res.redirect('back');
  }
});

router.get('/post/:postId', isLoggedIn, async function(req, res) {
  try {
    var user = await userModel.findOne({ username: req.session.passport.user });
    var post = await postModel.findOne({ _id:req.params.postId}).populate('user')
    
    post.duration = utils.getTimeDifferenceFromNow(new Date(post.date))    

    res.render('post.ejs', { footer: true, user, post });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/story/:userId',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  var storyUser = await userModel.findOne({_id:req.params.userId}).populate('stories')
  if(storyUser.stories.length === 0){
    res.redirect('/feed');
  }else{

    var stories = storyUser.stories.map(story => ({
      ...story.toObject(),
    duration: utils.getTimeDifferenceFromNow(new Date(story.date))
  }));

  var stories = stories.filter(async function (story){
    if(story.duration[1]==='d'){
      var ans = await storyModel.deleteOne({_id:story._id})
      var index = storyUser.stories.indexOf(story._id)
      storyUser.stories.splice(index,1)
      storyUser.save();
      return false;
    }
    else{
      return true;
    }
  })

  if(stories.length === 0){
    res.redirect('/feed')
  }
  else{
    res.render('story.ejs', {footer:false,user,storyUser,stories})
  }
}
});

router.get('/comment/:postId',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  var post = await postModel.findOne({_id:req.params.postId})
  if(!(post.comments.length === 0)){
    post = await postModel.findOne({_id:req.params.postId}).populate({
      path: 'comments',
      populate: {
        path: 'user',
        model: 'Users'
      }
    })
  }
  res.render('comment.ejs', {footer:true,user,post})
});

router.post('/commentPost/:postId',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  var post = await postModel.findOne({_id:req.params.postId})
  var newComment = await commentModel.create({
    user: user._id,
    comment: req.body.newComment,
  })

  post.comments.push(newComment._id)
  await post.save();

  res.redirect('back')
  

});

router.get('/like/comment/:commentId',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  var comment = await commentModel.findOne({_id:req.params.commentId})
  if(comment.likes.includes(user.username)){
    comment.likes.splice(comment.likes.indexOf(user.username),1)
  }
  else{
    comment.likes.push(user.username);
  }
  await comment.save()
  res.redirect('back');
});

router.get('/like/:postId',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  var post = await postModel.findOne({_id:req.params.postId})
  if(post.likes.includes(user._id)){
    post.likes.splice(post.likes.indexOf(user._id),1)
  }
  else{
    post.likes.push(user._id);
  }
  await post.save()
  res.json(post)
});

router.get('/save/:postId',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  if(user.saved.indexOf(req.params.postId) === -1){
    user.saved.push(req.params.postId)
  }
  else{
    var index = user.saved.indexOf(req.params.postId)
    user.saved.splice(index,1)
  }
  await user.save()
  res.json(user)
});

router.get('/profile',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user}).populate('posts')
  res.render('profile.ejs', {footer: true, user});
});

router.get('/profile/:id',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  var clickedUser = await userModel.findOne({_id:req.params.id}).populate('posts')
  if(user._id.toString() === req.params.id){
    res.redirect('/profile')
  }
  else{
    res.render('profile2.ejs', {footer: true, user, clickedUser});
  }
});

router.get('/follow/:id',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  var clickedUser = await userModel.findOne({_id:req.params.id})
  if(clickedUser.followers.indexOf(user._id) === -1){
    clickedUser.followers.push(user._id);
    user.followings.push(clickedUser._id);
  }
  else{
    clickedUser.followers.splice(clickedUser.followers.indexOf(user._id),1);
    user.followings.splice(user.followings.indexOf(clickedUser._id),1);
  }
  await user.save()
  await clickedUser.save()
  res.redirect('back');
});

router.get('/search',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  res.render('search.ejs', {footer: true,user});
});

router.get('/search/:username',isLoggedIn, async function(req, res) {
  var regex = new RegExp(`^${req.params.username}`)
  var users = await userModel.find({username: regex})
  res.json(users)
});

router.get('/edit',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  res.render('edit.ejs', {footer: true,user});
});

router.post('/update',isLoggedIn, upload.single('image'),async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  user.username = req.body.username
  user.name = req.body.name
  user.bio = req.body.bio
  if(req.file){
    user.profileImage = req.file.filename
  }
  req.session.passport.user = user.username;
  await user.save()
  res.redirect('/profile');
});

router.get('/upload',isLoggedIn, async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  res.render('upload.ejs', {footer: true,user});
});

router.post('/upload',isLoggedIn, upload.single("image") , async function(req, res) {
  var user = await userModel.findOne({username:req.session.passport.user})
  if(req.body.catagory === 'post'){
      const newPost = await postModel.create({
        picture:req.file.filename,
        caption:req.body.caption,
        user:user._id
      })
      
    user.posts.push(newPost._id)
  }
  else if(req.body.catagory === 'story'){
    const newStory = await storyModel.create({
      picture:req.file.filename,
      user:user._id
    })
    user.stories.push(newStory._id)
    setTimeout(async() => {
      await storyModel.findByIdAndDelete({_id: newStory._id})
      var index = user.stories.indexOf(newStory._id)
      user.stories.splice(index,1)
      await user.save()
    }, 1000*60*60*24);
  }
  else{
    req.send('get lost');
  }

  await user.save()
  res.redirect('/feed');
});

router.get('/messageList',isLoggedIn , async function(req, res) {
  const user = await userModel.findOne({username:req.session.passport.user}).populate('followings').populate('followers')

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

  res.render('messageUsers.ejs',{footer:false,user,messageUserArray});
});

router.get('/message/:oppositeUserId',isLoggedIn , async function(req, res) {

  const user = await userModel.findOne({username:req.session.passport.user}).populate('followings').populate('followers')
  const oppositeUser = await userModel.findOne({_id:req.params.oppositeUserId})

  res.render('chat.ejs',{footer:false,user,oppositeUser});
});

router.get('/getMessage/:oppositeUserId',isLoggedIn, async function(req,res,next){
  const user = await userModel.findOne({username:req.session.passport.user}).populate('followings').populate('followers')
  const oppositeUser = await userModel.findOne({username:req.params.oppositeUserId})

  const messages = await messageModel.find({
    $or:[
      {
        sender:user.username,
        receiver:oppositeUser.username
      },
      {
        receiver:user.username,
        sender:oppositeUser.username
      },
    ]
  })

  res.json(messages)

})
// Register route
router.post("/register", (req, res) => {
  // Validate user input
  const { username, name, email, password } = req.body;
  if (!username || !name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Create a new user
  const newUser = new userModel({ username, name, email });
  userModel.register(newUser, password, (err, user) => {
    if (err) {
      console.error('Error registering user:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    passport.authenticate("local")(req, res, () => {
      res.redirect('/profile');
    });
  });
});

// Login route
router.post('/login', passport.authenticate('local', {
  successRedirect: '/feed',
  failureRedirect: '/login',
}));

router.get('/logout', (req, res) => {
  req.logout(function(){
    res.redirect('/login'); 
  });
});

function isLoggedIn(req,res,next){
  if(req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = router;
