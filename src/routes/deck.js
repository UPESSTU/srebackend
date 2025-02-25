const express = require('express')


const {upload} = require('../utils/upload')

const authenticate = require('../middlewares/authenticate')
const authorizeRoles = require('../middlewares/permission')

const { 
    uploadDeck, 
    getDecks,
    getDeckById,
    getAssingedDecks,
    addDeck,
    changeStatusOfDeck,
    changeAnswerSheetCount,
    manualReminderToDrop,
    sendAssignmentMail
} = require('../controllers/deck')

const router = express.Router()

router.post(
    '/status',
    authenticate,
    authorizeRoles(['ADMIN', 'MODERATOR']),
    changeStatusOfDeck
)
router.post(
    '/count',
    authenticate,
    authorizeRoles(['ADMIN', 'MODERATOR']),
    changeAnswerSheetCount
)

router.get(
    '/all', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    getDecks

)

router.get(
    '/assigned', 
    authenticate, 
    authorizeRoles(['ADMIN', 'FACULTY', 'MODERATOR']), 
    getAssingedDecks
)

router.get(
    '/id/:qrString', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    getDeckById
)

router.post(
    '/upload', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    upload.single('file'),
    uploadDeck
)

router.post(
    '/add', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    addDeck
)

router.post(
    '/reminder',
    authenticate,
    authorizeRoles(['ADMIN', 'MODERATOR']),
    manualReminderToDrop
)

router.post(
    '/assignment-email',
    authenticate,
    authorizeRoles(['ADMIN', 'MODERATOR']),
    sendAssignmentMail
)


module.exports = router