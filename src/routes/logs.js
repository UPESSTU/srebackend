const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logs');
const authenticate = require('../middlewares/authenticate');
const permission = require('../middlewares/permission');
const authorizeRoles = require('../middlewares/permission')


// Routes requiring authentication and admin permission
router.get('/system', authenticate, authorizeRoles(['ADMIN', 'FACULTY', 'MODERATOR']), logsController.getLogs);
router.get('/dates', authenticate, authorizeRoles(['ADMIN', 'FACULTY', 'MODERATOR']), logsController.getLogDates);
router.post('/audit', authenticate, authorizeRoles(['ADMIN', 'FACULTY', 'MODERATOR']), logsController.createAuditLog);

module.exports = router;
