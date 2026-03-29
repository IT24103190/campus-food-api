// routes/analytics.js
const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');

const router = express.Router();

/**
 * 8.1 Total Amount Spent by a Student
 * GET /analytics/total-spent/:studentId
 */
router.get('/total-spent/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ error: 'Invalid studentId' });
        }

        const studentObjectId = new mongoose.Types.ObjectId(studentId);

        const result = await Order.aggregate([
            { $match: { student: studentObjectId } },
            { $group: { _id: '$student', totalSpent: { $sum: '$totalPrice' } } }
        ]);

        const totalSpent = (result && result.length > 0) ? result[0].totalSpent : 0;

        res.json({ studentId, totalSpent });
    } catch (err) {
        console.error('Error computing total spent:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * 8.2 Top Selling Menu Items
 * GET /analytics/top-menu-items?limit=5
 */
router.get('/top-menu-items', async (req, res) => {
    try {
        let limit = parseInt(req.query.limit, 10);
        if (Number.isNaN(limit) || limit <= 0) limit = 5;
        // Cap limit to prevent very large aggregations
        limit = Math.min(limit, 100);

        const pipeline = [
            { $unwind: '$items' },
            { $group: { _id: '$items.menuItem', totalQuantity: { $sum: '$items.quantity' } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: limit },
            // Lookup menu item details from MenuItem collection
            { $lookup: {
                from: 'menuitems', // collection name (Mongoose lowercases and pluralizes)
                localField: '_id',
                foreignField: '_id',
                as: 'menuItem'
            }},
            { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
            { $project: {
                _id: 0,
                menuItem: {
                    _id: '$menuItem._id',
                    name: '$menuItem.name',
                    price: '$menuItem.price',
                    category: '$menuItem.category'
                },
                totalQuantity: 1
            }}
        ];

        const agg = await Order.aggregate(pipeline);

        // For any entries where menuItem is missing, fill menuItem with id
        const formatted = agg.map(item => {
            if (!item.menuItem || !item.menuItem._id) {
                return {
                    menuItem: { _id: item._id, name: null, price: null, category: null },
                    totalQuantity: item.totalQuantity
                };
            }
            return item;
        });

        res.json({ limit, items: formatted });
    } catch (err) {
        console.error('Error fetching top menu items:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * 8.3 Daily Order Counts
 * GET /analytics/daily-orders
 */
router.get('/daily-orders', async (req, res) => {
    try {
        // Group by date string (YYYY-MM-DD) using createdAt
        const pipeline = [
            { $match: { createdAt: { $exists: true } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                orderCount: { $sum: 1 }
            }},
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', orderCount: 1 } }
        ];

        const results = await Order.aggregate(pipeline);

        res.json({ dailyOrders: results });
    } catch (err) {
        console.error('Error fetching daily orders:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
