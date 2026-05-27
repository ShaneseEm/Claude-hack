require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { connectDB } = require('./db');

const medicineRoutes = require('./routes/medicineRoutes');
const reportRoutes = require('./routes/report');
const smsRoutes = require('./routes/sms');
const ussdRoutes = require('./routes/ussd');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api', medicineRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/ussd', ussdRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] AgukaMed running on http://localhost:${PORT}`);
  });
})();
