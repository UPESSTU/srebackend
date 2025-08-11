const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Get system logs with filterconst createAuditLog = async (req, res) => {
    try {
        const { action, target, details } = req.body;
        
        if (!req.auth || !req.auth.user) {
            return res.status(403).json({
                success: false,
                message: 'Authentication required'
            });
        }lities
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLogs = async (req, res) => {
    try {
        const { level = 'info', date, limit = 100, page = 1, search = '', userId } = req.query;
        
        // Access is already checked by middleware, no need to recheck here
        // We'll leave this code commented for reference
        /*
        if (!req.auth || !req.auth.user || req.auth.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        */

        // Determine which log file to read based on level and date
        const logDate = date || new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const fileName = `${level}-${logDate}.log`;
        const logFilePath = path.join(__dirname, '..', '..', 'logs', fileName);

        // Check if file exists
        try {
            await fs.access(logFilePath);
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: `Log file for ${level} on ${logDate} not found`
            });
        }

        // Read log file
        const fileContent = await fs.readFile(logFilePath, 'utf8');
        
        // Parse log entries (each line is a JSON object)
        let logEntries = fileContent.trim().split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (err) {
                    return { message: line, timestamp: '', level: 'unknown' };
                }
            });
        
        // Apply search filter if provided
        if (search) {
            logEntries = logEntries.filter(entry => 
                entry.message && entry.message.toLowerCase().includes(search.toLowerCase()));
        }
        
        // Apply user filter if provided
        if (userId) {
            logEntries = logEntries.filter(entry => 
                entry.userId === userId || 
                (entry.message && entry.message.includes(userId)));
        }
        
        // Sort by timestamp (newest first)
        logEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedEntries = logEntries.slice(startIndex, endIndex);
        
        // Return the logs with pagination metadata
        res.json({
            success: true,
            dbRes: {
                logs: paginatedEntries,
                pagination: {
                    total: logEntries.length,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(logEntries.length / limit)
                }
            }
        });
    } catch (err) {
        logger.error(`Error getting logs: ${err.message || err.toString()}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching logs'
        });
    }
};

/**
 * Get list of available log dates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLogDates = async (req, res) => {
    try {
        // Access is already checked by middleware, no need to recheck here
        // We'll leave this code commented for reference
        /*
        if (!req.auth || !req.auth.user || req.auth.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        */

        const logsDir = path.join(__dirname, '..', '..', 'logs');
        const files = await fs.readdir(logsDir);
        
        // Extract unique dates from log filenames
        const dateRegex = /-([\d-]+)\.log$/;
        const dates = files
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const match = file.match(dateRegex);
                return match ? match[1] : null;
            })
            .filter(Boolean);
        
        // Get unique dates
        const uniqueDates = [...new Set(dates)].sort().reverse();
        
        res.json({
            success: true,
            dbRes: uniqueDates
        });
    } catch (err) {
        logger.error(`Error getting log dates: ${err.message || err.toString()}`);
        res.status(500).json({
            success: false,
            message: 'Error fetching log dates'
        });
    }
};

/**
 * Create system audit log for user actions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createAuditLog = async (req, res) => {
    try {
        const { action, target, details } = req.body;
        
        if (!req.auth || !req.auth.user || !req.auth.user._id) {
            return res.status(403).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'Action description is required'
            });
        }
        
        // Create audit log entry
        logger.info(JSON.stringify({
            type: 'AUDIT',
            userId: req.auth.user._id,
            userEmail: req.auth.user.emailAddress,
            userName: `${req.auth.user.firstName || ''} ${req.auth.user.lastName || ''}`.trim(),
            action,
            target,
            details,
            ip: req.ip
        }));
        
        res.json({
            success: true,
            message: 'Audit log created'
        });
    } catch (err) {
        logger.error(`Error creating audit log: ${err.message || err.toString()}`);
        res.status(500).json({
            success: false,
            message: 'Error creating audit log'
        });
    }
};

module.exports = {
    getLogs,
    getLogDates,
    createAuditLog
};
