// routes/orders.js 
const express = require('express');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Student = require('../models/student'); // use correct filename casing

const router = express.Router();

// Helper: calculate totalPrice from items 
async function calculateTotalPrice(items) {
    const menuItemIds = items.map(item => item.menuItem);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });

    const priceMap = new Map();
    menuItems.forEach(item => priceMap.set(item._id.toString(), item.price));

    let totalPrice = 0;
    for (const item of items) {
        const itemPrice = priceMap.get(item.menuItem.toString());
        if (!itemPrice) {
            throw new Error(`Menu item with ID ${item.menuItem} not found.`);
        }
        totalPrice += itemPrice * item.quantity;
    }
    return totalPrice;
}

// POST /orders – place order 
router.post('/', async (req, res) => {
    try {
        const { student, items } = req.body;

        if (!student) {
            return res.status(400).json({ message: 'Student ID is required.' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Items array cannot be empty.' });
        }

        // Validate if student exists
        const existingStudent = await Student.findById(student);
        if (!existingStudent) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const totalPrice = await calculateTotalPrice(items);

        const order = new Order({
            student,
            items,
            totalPrice,
            status: 'pending' // Default status
        });

        const savedOrder = await order.save();

        // Populate student and items.menuItem for the response
        const populatedOrder = await Order.findById(savedOrder._id)
            .populate('student', 'name email') // Assuming Student model has name and email
            .populate('items.menuItem', 'name price'); // Assuming MenuItem has name and price

        res.status(201).json(populatedOrder);
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ message: err.message });
    }
});

// GET /orders – list orders (with pagination support) 
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('student', 'name email')
            .populate('items.menuItem', 'name price');

        const totalOrders = await Order.countDocuments();

        res.json({
            totalOrders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            orders
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /orders/:id – get order by ID 
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('student', 'name email')
            .populate('items.menuItem', 'name price');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ message: 'Invalid Order ID' });
    }
});

// PATCH /orders/:id/status – update order status 
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Allowed values are: ${allowedStatuses.join(', ')}` });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        )
            .populate('student', 'name email')
            .populate('items.menuItem', 'name price');

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(updatedOrder);
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ message: err.message });
    }
});

// DELETE /orders/:id – delete order 
router.delete('/:id', async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id);

        if (!deletedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ message: 'Invalid Order ID' });
    }
});

module.exports = router;