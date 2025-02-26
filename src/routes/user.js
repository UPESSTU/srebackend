const express = require('express')
const authenticate = require('../middlewares/authenticate')
const {
    getProfile,
    getUsers,
    changePassword,
    deleteFaculty
} = require('../controllers/user')
const authorizeRoles = require('../middlewares/permission')

const router = express.Router()

router.get(
    '/profile', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR', 'FACULTY']), 
    getProfile
)
router.get(
    '/profile/:userId', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    getProfile
)

router.get(
    '/users', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    getUsers
)

router.put(
    '/change-password', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR', 'FACULTY']), 
    changePassword
)

router.delete(
    '/delete-users',
    authenticate,
    authorizeRoles(['ADMIN']),
    deleteFaculty
)

module.exports = router