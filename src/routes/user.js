const express = require('express')
const authenticate = require('../middlewares/authenticate')
const auditLog = require('../middlewares/auditLogger')
const {
    getProfile,
    getUsers,
    changePassword,
    deleteFaculty,
    changeRole,
    getUserById,
    deleteUserById,
    exportUsers
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
    getUserById
)

router.get(
    '/users', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    getUsers
)

router.put(
    '/change-role', 
    authenticate, 
    authorizeRoles(['ADMIN']),
    auditLog({ action: 'change_role', resource: 'user' }),
    changeRole
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

router.get(
    '/export',
    exportUsers
)

router.put(
    '/delete-by-id',
    authenticate,
    authorizeRoles(['ADMIN']),
    deleteUserById
)

module.exports = router