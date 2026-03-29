require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import route modules
const studentsRouter = require('./routes/students');
const menuItemsRouter = require('./routes/menuItems');
const ordersRouter = require('./routes/orders');
const analyticsRouter = require('./routes/analytics');

const app = express();

// Read configuration from environment variables with sensible defaults
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Campus Food API is running' });
});

// Attach routes
app.use('/students', studentsRouter);
app.use('/menu-items', menuItemsRouter);
app.use('/orders', ordersRouter);
app.use('/analytics', analyticsRouter);

// Database connection and server start
mongoose.set('strictQuery', false);
mongoose.connect(MONGODB_URI)
    .then(() => {
        app.listen(PORT, () => {
            console.log('✅ connected to mongoDB');
            console.log(`✅ Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err.message);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('SIGINT received: closing MongoDB connection');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

