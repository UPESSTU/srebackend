const express = require('express')

const authenticate = require('../middlewares/authenticate')
const { getSchools, getSchoolById, addSchool } = require('../controllers/school')
const authorizeRoles = require('../middlewares/permission')

const router = express.Router()

router.get(
    '/all', 
    authenticate, 
    authorizeRoles(['ADMIN']),
    getSchools
)

router.get(
    '/id/:schoolId', 
    authenticate, 
    authorizeRoles(['ADMIN']),
    getSchoolById
)

router.post(
    '/create', 
    authenticate,
    authorizeRoles(['ADMIN']),
    addSchool
)


module.exports = router