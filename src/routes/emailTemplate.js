const express = require('express')

const authenticate = require('../middlewares/authenticate')
const authorizeRoles = require('../middlewares/permission')
const { 
    getTemplates, 
    getTemplateById, 
    addTemplate 
} = require('../controllers/emailTemplate')
const router = express.Router()

router.get(
    '/', 
    authenticate, 
    authorizeRoles(['ADMIN']),
    getTemplates
)

router.post(
    '/create-update', 
    authenticate,
    authorizeRoles(['ADMIN']),
    addTemplate
)

router.get(
    '/id/:templateId',
    authenticate,
    authorizeRoles(['ADMIN']),
    getTemplateById
)

module.exports = router