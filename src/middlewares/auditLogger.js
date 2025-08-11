/**
 * Middleware for automatically logging user actions
 * This will capture API calls and record them as audit logs
 */
const logger = require('../utils/logger');

/**
 * Create an audit log middleware
 * @param {Object} options - Configuration options
 * @param {String} options.action - The action being performed (e.g., 'view', 'create', 'update', 'delete')
 * @param {String} options.resource - The resource being acted upon (e.g., 'user', 'deck')
 * @param {Function} options.getEntityId - Function to extract the entity ID from the request (optional)
 * @param {Function} options.getDetails - Function to extract additional details from the request (optional)
 * @returns {Function} Express middleware function
 */
const auditLog = (options) => {
    return (req, res, next) => {
        // Store the original send function
        const originalSend = res.send;
        
        // Get action details from options or defaults
        const action = options.action || req.method;
        const resource = options.resource || req.baseUrl.split('/').pop();
        
        // Extract entity ID if getEntityId function is provided, otherwise try from URL params or body
        let entityId = null;
        if (options.getEntityId) {
            entityId = options.getEntityId(req);
        } else if (req.params.id) {
            entityId = req.params.id;
        } else if (req.body && req.body._id) {
            entityId = req.body._id;
        }
        
        // Extract additional details if getDetails function is provided
        let details = null;
        if (options.getDetails) {
            details = options.getDetails(req);
        }
        
        // Override the send function to intercept the response
        res.send = function(data) {
            // Get the original response
            res.send = originalSend;
            
            // Parse the response if it's JSON
            let parsedData = null;
            try {
                parsedData = JSON.parse(data);
            } catch (e) {
                // If not JSON, just use as is
                parsedData = data;
            }
            
            // Only log successful operations (status codes 2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Create the audit log
                try {
                    if (req.auth && req.auth.user) {
                        // Prepare log data
                        const logData = {
                            type: 'AUDIT',
                            userId: req.auth.user._id,
                            userEmail: req.auth.user.emailAddress,
                            userName: `${req.auth.user.firstName || ''} ${req.auth.user.lastName || ''}`.trim(),
                            action,
                            resource,
                            entityId,
                            details: details || undefined,
                            statusCode: res.statusCode,
                            method: req.method,
                            url: req.originalUrl,
                            ip: req.ip,
                            timestamp: new Date().toISOString()
                        };
                        
                        // Log the action
                        logger.info(JSON.stringify(logData));
                    }
                } catch (err) {
                    // Don't let logging errors affect the response
                    console.error('Error creating audit log:', err);
                }
            }
            
            // Send the original response
            return res.send(data);
        };
        
        next();
    };
};

module.exports = auditLog;
