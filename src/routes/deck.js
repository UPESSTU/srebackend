const express = require('express')


const {upload} = require('../utils/upload')
const authenticate = require('../middlewares/authenticate')
const authorizeRoles = require('../middlewares/permission')
const { 
    uploadDeck, 
    getDecks,
    getDeckById,
    getAssingedDecks,
    pickUpDeck
} = require('../controllers/deck')

const router = express.Router()

router.post(
    '/pickup',
    authenticate,
    authorizeRoles(['ADMIN', 'FACULTY', 'MODERATOR']),
    pickUpDeck
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
    '/id/:deckId', 
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


module.exports = router