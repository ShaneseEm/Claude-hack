const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { isConnected } = require('../db');
const Report = require('../models/Report');

const reportsFile = path.join(__dirname, '../data/reports.json');

function loadJsonReports() {
  if (!fs.existsSync(reportsFile)) return [];
  try { return JSON.parse(fs.readFileSync(reportsFile, 'utf8')); } catch { return []; }
}

function appendJsonReport(report) {
  const reports = loadJsonReports();
  reports.push(report);
  fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2));
}

// POST /api/report
router.post('/', async (req, res) => {
  const { productName, location, sellerInfo, description, channel = 'web' } = req.body;
  if (!productName) return res.status(400).json({ success: false, error: 'Product name is required.' });

  const refId = `RPT-${Date.now().toString().slice(-6)}`;
  const payload = {
    refId,
    productName,
    location: location || 'Not specified',
    sellerInfo: sellerInfo || 'Not specified',
    description: description || '',
    channel
  };

  try {
    if (isConnected()) {
      await Report.create(payload);
    } else {
      appendJsonReport({ ...payload, id: refId, timestamp: new Date().toISOString() });
    }
    res.json({ success: true, refId, message: 'Report submitted. Rwanda FDA has been notified.' });
  } catch (err) {
    console.error('[Report] Failed to save report:', err.message);
    // Fall back to JSON on Mongo failure
    try {
      appendJsonReport({ ...payload, id: refId, timestamp: new Date().toISOString() });
      res.json({ success: true, refId, message: 'Report submitted (offline). Rwanda FDA has been notified.' });
    } catch (jsonErr) {
      res.status(500).json({ success: false, error: 'Could not save report.' });
    }
  }
});

// GET /api/report — list all reports
router.get('/', async (req, res) => {
  try {
    if (isConnected()) {
      const reports = await Report.find({}).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, reports });
    }
    res.json({ success: true, reports: loadJsonReports() });
  } catch (err) {
    console.error('[Report] List failed:', err.message);
    res.status(500).json({ success: false, error: 'Could not load reports.' });
  }
});

module.exports = router;
