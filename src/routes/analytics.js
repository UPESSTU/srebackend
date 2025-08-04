const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics');
const { verifyToken } = require('../middlewares/authenticate');

// Apply authentication middleware to all routes
// router.use(verifyToken);

/**
 * @route GET /api/v1/analytics/debug
 * @desc Debug database contents
 * @access Private
 */
router.get('/debug', analyticsController.debugDatabase);

/**
 * @route GET /api/v1/analytics/deck-counts
 * @desc Get deck counts by status and date range
 * @access Private
 * @query {string} startDate - Start date (YYYY-MM-DD)
 * @query {string} endDate - End date (YYYY-MM-DD)
 * @query {string} status - Deck status filter (PENDING, PICKED_UP, DROPPED)
 */
router.get('/deck-counts', analyticsController.getDeckCounts);

/**
 * @route GET /api/v1/analytics/dashboard-stats
 * @desc Get comprehensive dashboard statistics
 * @access Private
 * @query {string} startDate - Start date (YYYY-MM-DD)
 * @query {string} endDate - End date (YYYY-MM-DD)
 */
router.get('/dashboard-stats', analyticsController.getDashboardStats);

/**
 * @route GET /api/v1/analytics/daily-trends
 * @desc Get daily trends for charts
 * @access Private
 * @query {number} days - Number of days to look back (default: 30)
 */
router.get('/daily-trends', analyticsController.getDailyTrends);

/**
 * @route GET /api/v1/analytics/evaluator-stats
 * @desc Get evaluator performance statistics
 * @access Private
 * @query {string} startDate - Start date (YYYY-MM-DD)
 * @query {string} endDate - End date (YYYY-MM-DD)
 * @query {number} limit - Number of top evaluators to return (default: 10)
 */
router.get('/evaluator-stats', analyticsController.getEvaluatorStats);

module.exports = router;
