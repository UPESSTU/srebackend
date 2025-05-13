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
    sendAssignmentMail,
    updateDeck,
    deleteAllDecks,
    generatePamplets,
    generatePampletsPdf,
    exportDecks,
    tempDeleteData,
    deleteById,
    countDecks
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

router.delete(
    '/delete',
    authenticate,
    authorizeRoles(['ADMIN']),
    deleteAllDecks
)

router.put(
    '/update',
    authenticate,
    authorizeRoles(['ADMIN', 'MODERATOR']),
    updateDeck
)

// router.get(
//     '/delete-temp',
//     tempDeleteData
// )

router.get(
    '/all', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    getDecks

)

router.delete(
    '/deletebyid/:deckId', 
    authenticate, 
    authorizeRoles(['ADMIN']), 
    deleteById

)

router.get(
    '/assigned', 
    authenticate, 
    authorizeRoles(['ADMIN', 'FACULTY', 'MODERATOR']), 
    getAssingedDecks
)

router.get(
    '/count', 
    authenticate, 
    authorizeRoles(['ADMIN', 'FACULTY', 'MODERATOR']), 
    countDecks
)

router.get(
    '/id/:qrString', 
    authenticate, 
    authorizeRoles(['ADMIN', 'MODERATOR']), 
    getDeckById
)

router.get(
    '/pamplets.html', 
    // authenticate, 
    // authorizeRoles(['ADMIN', 'MODERATOR']), 
    generatePamplets
)

router.get(
    '/export', 
    // authenticate, 
    // authorizeRoles(['ADMIN', 'MODERATOR']), 
    exportDecks
)

router.get(
    '/pamplets.pdf', 
    // authenticate, 
    // authorizeRoles(['ADMIN', 'MODERATOR']), 
    generatePampletsPdf
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