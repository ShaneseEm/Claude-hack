const mongoose = require('mongoose');

const PerfumeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    brand: String,
    manufacturer: String,
    regNo: { type: String, index: true },
    type: String,
    verified: { type: Boolean, default: false },
    ingredients: String,
    warnings: String,
    warningRw: String,
    instructions: String,
    instructionsRw: String,
    batchFormat: String,
    expiryStatus: String,
    category: { type: String, default: 'perfume' }
  },
  { timestamps: true, collection: 'perfumes' }
);

module.exports = mongoose.model('Perfume', PerfumeSchema);
