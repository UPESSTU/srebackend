const multer = require('multer')
const path = require('path')


const storage = multer.diskStorage({


  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'))
  },

  filename: (req, file, cb) => {

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${uniqueSuffix}-${file.originalname}`)
  }

})

exports.upload = multer({ storage: storage })

