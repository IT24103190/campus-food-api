// routes/menuItems.js 
const express = require('express');
const MenuItem = require('../models/MenuItem');

const router = express.Router();

// POST /menu-items – create menu item 
router.post('/menu-items', async (req, res) => {
    try {
        const menuItem = new MenuItem(req.body);
        const savedMenuItem = await menuItem.save();
        res.status(201).json(savedMenuItem);
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ message: err.message });
    }
});

// GET /menu-items – list all menu items 
router.get('/menu-items', async (req, res) => {
    try {
        const menuItems = await MenuItem.find().sort({ createdAt: -1 });
        res.json(menuItems);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 7.1 Search Menu Items 
// GET /menu-items/search?name=...&category=... 
router.get('menu-items/search', async (req, res) => {
    try {
        const { name, category } = req.query;
        const filter = {};

        if (name) {
            filter.name = { $regex: name, $options: 'i' }; // Partial, case-insensitive match
        }
        if (category) {
            filter.category = category;
        }

        const menuItems = await MenuItem.find(filter).sort({ name: 1 });
        res.json(menuItems);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;