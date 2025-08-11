const express = require('express')
const { 
    signIn, 
    signUp, 
    requestChangePassword, 
    changePassword, 
    loggout, 
    addFacultyBulk, 
    passwordChange
} = require('../controllers/auth')
const { upload } = require('../utils/upload')
const authenticate = require('../middlewares/authenticate')
const authorizeRoles = require('../middlewares/permission')
const auditLog = require('../middlewares/auditLogger')

const router = express.Router()

router.post('/login', auditLog({ action: 'login', resource: 'auth' }), signIn)
router.post(
    '/register', 
    authenticate,
    authorizeRoles(['ADMIN']), 
    signUp
)

router.post(
    '/faculty-add', 
    authenticate,
    authorizeRoles(['ADMIN']), 
    upload.single('file'),
    auditLog({ action: 'add_faculty_bulk', resource: 'users' }),
    addFacultyBulk
)

router.post(
    '/request-change-password',
    requestChangePassword
)

router.post(
    '/change-password',
    changePassword
)

router.put(
    '/changepassword',
    authenticate,
    authorizeRoles(['ADMIN', 'MODERATOR']),
    passwordChange
)

router.get('/logout', loggout)


module.exports = router