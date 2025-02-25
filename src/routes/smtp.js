const express = require('express')

const authenticate = require('../middlewares/authenticate')
const authorizeRoles = require('../middlewares/permission')
const { getSMTP, addSMTP } = require('../controllers/smtp')
const router = express.Router()

router.get(
    '/', 
    authenticate, 
    authorizeRoles(['ADMIN']),
    getSMTP
)

router.post(
    '/new', 
    authenticate,
    authorizeRoles(['ADMIN']),
    addSMTP
)


module.exports = router