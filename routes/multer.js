const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    const extname = path.extname(file.originalname);
    cb(null, randomName + extname);
  }
})

const upload = multer({ storage: storage })

module.exports = upload;
