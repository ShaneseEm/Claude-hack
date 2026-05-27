const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    refId: { type: String, required: true, unique: true, index: true },
    productName: { type: String, required: true },
    location: { type: String, default: 'Not specified' },
    sellerInfo: { type: String, default: 'Not specified' },
    description: { type: String, default: '' },
    channel: { type: String, default: 'web' }
  },
  { timestamps: true, collection: 'reports' }
);

module.exports = mongoose.model('Report', ReportSchema);
