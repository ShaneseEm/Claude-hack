const mongoose = require('mongoose');

const ScanLogSchema = new mongoose.Schema(
  {
    medicineName: String,
    genericName: String,
    manufacturer: String,
    regNo: String,
    strength: String,
    detectedText: String,
    verified: Boolean,
    alertLevel: { type: String, enum: ['safe', 'warning', 'danger'], default: 'warning' },
    matchType: String,
    reason: String,
    source: String,
    channel: { type: String, default: 'web' },
    presetKey: String
  },
  { timestamps: true, collection: 'scan_logs' }
);

module.exports = mongoose.model('ScanLog', ScanLogSchema);
