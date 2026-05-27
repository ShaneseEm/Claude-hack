const mongoose = require('mongoose');

const CosmeticSchema = new mongoose.Schema(
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
    expiryStatus: String,
    category: { type: String, default: 'cosmetic' }
  },
  { timestamps: true, collection: 'cosmetics' }
);

module.exports = mongoose.model('Cosmetic', CosmeticSchema);
