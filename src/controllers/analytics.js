const Deck = require('../models/deck');
const User = require('../models/user');
const logger = require('../utils/logger');

/**
 * Debug endpoint to check database contents
 */
exports.debugDatabase = async (req, res) => {
    try {
        // Get total counts without any filters
        const totalDecks = await Deck.countDocuments({});
        const totalUsers = await User.countDocuments({});
        
        // Get all deck statuses
        const allStatuses = await Deck.aggregate([
            {
                $group: {
                    _id: '$statusOfDeck',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Get sample decks to check data structure
        const sampleDecks = await Deck.find({}).limit(5).lean();
        
        // Get date range of exams
        const dateRange = await Deck.aggregate([
            {
                $group: {
                    _id: null,
                    minDate: { $min: '$examDate' },
                    maxDate: { $max: '$examDate' }
                }
            }
        ]);
        
        res.status(200).json({
            message: "Database debug info",
            data: {
                totalDecks,
                totalUsers,
                allStatuses,
                sampleDecks: sampleDecks.map(d => ({
                    _id: d._id,
                    examDate: d.examDate,
                    examDateAsDate: d.examDate ? new Date(d.examDate * 1000) : null,
                    statusOfDeck: d.statusOfDeck,
                    school: d.school,
                    courseCode: d.courseCode,
                    courseName: d.courseName
                })),
                dateRange: dateRange[0] ? {
                    minDate: dateRange[0].minDate,
                    maxDate: dateRange[0].maxDate,
                    minDateAsDate: new Date(dateRange[0].minDate * 1000),
                    maxDateAsDate: new Date(dateRange[0].maxDate * 1000)
                } : null
            },
            success: true
        });
        
    } catch (error) {
        logger.error('Error in debug endpoint:', error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
            success: false
        });
    }
};

/**
 * Get deck counts by status and date range
 */
exports.getDeckCounts = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        
        // Build query filter
        let query = {};
        
        // Debug: Log the incoming parameters
        console.log('getDeckCounts params:', { startDate, endDate, status });
        
        // Date filter - handle both ISO dates and Unix timestamps
        if (startDate || endDate) {
            // For examDate (Unix timestamp) - this is the primary date field for filtering
            if (startDate || endDate) {
                query.examDate = {};
                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    query.examDate.$gte = Math.floor(start.getTime() / 1000);
                    console.log('Start date filter:', startDate, '-> timestamp:', Math.floor(start.getTime() / 1000));
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    query.examDate.$lte = Math.floor(end.getTime() / 1000);
                    console.log('End date filter:', endDate, '-> timestamp:', Math.floor(end.getTime() / 1000));
                }
            }
        }
        
        // Status filter
        if (status) {
            query.statusOfDeck = status;
        }
        
        console.log('Final query:', JSON.stringify(query, null, 2));
        
        // First, let's check if we have any decks at all
        const totalDecks = await Deck.countDocuments({});
        console.log('Total decks in database:', totalDecks);
        
        // Check sample deck to understand data structure
        const sampleDeck = await Deck.findOne({}).lean();
        console.log('Sample deck structure:', {
            _id: sampleDeck?._id,
            statusOfDeck: sampleDeck?.statusOfDeck,
            createdAt: sampleDeck?.createdAt,
            updatedAt: sampleDeck?.updatedAt,
            examDate: sampleDeck?.examDate,
            school: sampleDeck?.school
        });
        
        // Get count using MongoDB aggregation for efficiency
        const result = await Deck.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$statusOfDeck',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        console.log('Aggregation result:', result);
        
        // Format response
        const counts = {
            PENDING: 0,
            PICKED_UP: 0,
            DROPPED: 0,
            total: 0
        };
        
        result.forEach(item => {
            if (item._id) {
                counts[item._id] = item.count;
                counts.total += item.count;
            }
        });
        
        res.status(200).json({
            message: "Deck counts retrieved successfully",
            dbRes: counts,
            success: true,
            debug: {
                totalDecksInDB: totalDecks,
                query: query,
                aggregationResult: result,
                sampleDeckStructure: sampleDeck ? {
                    statusOfDeck: sampleDeck.statusOfDeck,
                    createdAt: sampleDeck.createdAt,
                    updatedAt: sampleDeck.updatedAt,
                    examDate: sampleDeck.examDate
                } : null
            }
        });
        
    } catch (error) {
        logger.error('Error getting deck counts:', error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
            success: false
        });
    }
};

/**
 * Get dashboard statistics efficiently
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        console.log('getDashboardStats params:', { startDate, endDate });
        
        // Build date filter if provided - use examDate (Unix timestamp)
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.examDate = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                dateFilter.examDate.$gte = Math.floor(start.getTime() / 1000);
                console.log('Start date filter:', startDate, '-> timestamp:', Math.floor(start.getTime() / 1000));
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.examDate.$lte = Math.floor(end.getTime() / 1000);
                console.log('End date filter:', endDate, '-> timestamp:', Math.floor(end.getTime() / 1000));
            }
        }
        
        console.log('Date filter:', JSON.stringify(dateFilter, null, 2));
        
        // Check total decks without any filter first
        const totalDecksWithoutFilter = await Deck.countDocuments({});
        console.log('Total decks without filter:', totalDecksWithoutFilter);
        
        // Parallel execution for better performance
        const [
            deckStats,
            userCount,
            schoolCount,
            recentActivity
        ] = await Promise.all([
            // Deck statistics
            Deck.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: '$statusOfDeck',
                        count: { $sum: 1 }
                    }
                }
            ]),
            
            // User count
            User.countDocuments({}),
            
            // Unique schools count
            Deck.distinct('school', dateFilter),
            
            // Recent activities (last 10)
            Deck.aggregate([
                { $match: dateFilter },
                {
                    $match: {
                        $or: [
                            { pickUpTimestamp: { $exists: true } },
                            { dropTimestamp: { $exists: true } }
                        ]
                    }
                },
                {
                    $addFields: {
                        lastActivity: {
                            $max: ['$pickUpTimestamp', '$dropTimestamp']
                        }
                    }
                },
                { $sort: { lastActivity: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'evaluator',
                        foreignField: '_id',
                        as: 'evaluatorInfo'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        courseCode: 1,
                        courseName: 1,
                        statusOfDeck: 1,
                        school: 1,
                        pickUpTimestamp: 1,
                        dropTimestamp: 1,
                        lastActivity: 1,
                        evaluatorInfo: { $arrayElemAt: ['$evaluatorInfo', 0] }
                    }
                }
            ])
        ]);
        
        console.log('Deck stats result:', deckStats);
        console.log('User count:', userCount);
        console.log('School count:', schoolCount.length);
        console.log('Recent activity count:', recentActivity.length);
        
        // If no results with date filter, try without date filter to debug
        if (deckStats.length === 0 && (startDate || endDate)) {
            console.log('No results with date filter, trying without date filter...');
            const allDeckStats = await Deck.aggregate([
                {
                    $group: {
                        _id: '$statusOfDeck',
                        count: { $sum: 1 }
                    }
                }
            ]);
            console.log('All deck stats (no date filter):', allDeckStats);
            
            // Also check a few sample documents to see the date format
            const sampleDecks = await Deck.find({}).limit(3).lean();
            console.log('Sample decks:', sampleDecks.map(d => ({
                _id: d._id,
                examDate: d.examDate,
                statusOfDeck: d.statusOfDeck,
                school: d.school
            })));
        }
        
        // Format deck statistics
        const deckCounts = {
            PENDING: 0,
            PICKED_UP: 0,
            DROPPED: 0,
            total: 0
        };
        
        deckStats.forEach(item => {
            deckCounts[item._id] = item.count;
            deckCounts.total += item.count;
        });
        
        // Calculate completion rate
        const completionRate = deckCounts.total > 0 
            ? Math.round((deckCounts.DROPPED / deckCounts.total) * 100) 
            : 0;
        
        const response = {
            overview: {
                totalDecks: deckCounts.total,
                totalUsers: userCount,
                totalSchools: schoolCount.length,
                completionRate,
                pendingDecks: deckCounts.PENDING,
                pickedUpDecks: deckCounts.PICKED_UP,
                droppedDecks: deckCounts.DROPPED
            },
            statusDistribution: Object.entries(deckCounts)
                .filter(([key]) => key !== 'total')
                .map(([status, count]) => ({
                    name: status.replace('_', ' '),
                    value: count
                })),
            recentActivity: recentActivity.map(deck => ({
                id: deck._id,
                action: deck.dropTimestamp > (deck.pickUpTimestamp || 0) ? 'Dropped' : 'Picked Up',
                evaluator: deck.evaluatorInfo 
                    ? `${deck.evaluatorInfo.firstName || ''} ${deck.evaluatorInfo.lastName || ''}`.trim() 
                    : 'Unknown',
                course: `${deck.courseCode} - ${deck.courseName}`,
                school: deck.school,
                timestamp: deck.lastActivity
            }))
        };
        
        res.status(200).json({
            message: "Dashboard statistics retrieved successfully",
            dbRes: response,
            success: true,
            debug: {
                totalDecksWithoutFilter,
                dateFilter,
                deckStatsRaw: deckStats
            }
        });
        
    } catch (error) {
        logger.error('Error getting dashboard stats:', error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
            success: false
        });
    }
};

/**
 * Get daily trends for charts
 */
exports.getDailyTrends = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysCount = parseInt(days);
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysCount);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        
        const trends = await Deck.aggregate([
            {
                $match: {
                    examDate: {
                        $gte: Math.floor(startDate.getTime() / 1000),
                        $lte: Math.floor(endDate.getTime() / 1000)
                    }
                }
            },
            {
                $addFields: {
                    examDateObj: {
                        $toDate: { $multiply: ['$examDate', 1000] }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$examDateObj' },
                        month: { $month: '$examDateObj' },
                        day: { $dayOfMonth: '$examDateObj' },
                        status: '$statusOfDeck'
                    },
                    count: { $sum: 1 },
                    studentCount: { $sum: '$studentCount' }
                }
            },
            {
                $group: {
                    _id: {
                        year: '$_id.year',
                        month: '$_id.month',
                        day: '$_id.day'
                    },
                    statusCounts: {
                        $push: {
                            status: '$_id.status',
                            count: '$count'
                        }
                    },
                    totalStudents: { $sum: '$studentCount' },
                    totalDecks: { $sum: '$count' }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1,
                    '_id.day': 1
                }
            }
        ]);
        
        res.status(200).json({
            message: "Daily trends retrieved successfully",
            dbRes: trends,
            success: true
        });
        
    } catch (error) {
        logger.error('Error getting daily trends:', error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
            success: false
        });
    }
};

/**
 * Get evaluator performance statistics
 */
exports.getEvaluatorStats = async (req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;
        
        // Build date filter using examDate (Unix timestamp)
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.examDate = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                dateFilter.examDate.$gte = Math.floor(start.getTime() / 1000);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.examDate.$lte = Math.floor(end.getTime() / 1000);
            }
        }
        
        const evaluatorStats = await Deck.aggregate([
            { $match: dateFilter },
            {
                $match: {
                    evaluator: { $exists: true, $ne: null }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'evaluator',
                    foreignField: '_id',
                    as: 'evaluatorInfo'
                }
            },
            {
                $unwind: '$evaluatorInfo'
            },
            {
                $group: {
                    _id: '$evaluator',
                    name: { 
                        $first: {
                            $concat: [
                                { $ifNull: ['$evaluatorInfo.firstName', ''] },
                                ' ',
                                { $ifNull: ['$evaluatorInfo.lastName', ''] }
                            ]
                        }
                    },
                    email: { $first: '$evaluatorInfo.emailAddress' },
                    total: { $sum: 1 },
                    completed: {
                        $sum: {
                            $cond: [{ $eq: ['$statusOfDeck', 'DROPPED'] }, 1, 0]
                        }
                    },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ['$statusOfDeck', 'PENDING'] }, 1, 0]
                        }
                    },
                    pickedUp: {
                        $sum: {
                            $cond: [{ $eq: ['$statusOfDeck', 'PICKED_UP'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    efficiency: {
                        $cond: [
                            { $gt: ['$total', 0] },
                            { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { total: -1 } },
            { $limit: parseInt(limit) }
        ]);
        
        res.status(200).json({
            message: "Evaluator statistics retrieved successfully",
            dbRes: evaluatorStats,
            success: true
        });
        
    } catch (error) {
        logger.error('Error getting evaluator stats:', error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
            success: false
        });
    }
};
