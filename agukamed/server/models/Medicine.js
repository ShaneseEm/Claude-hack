const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    genericName: String,
    manufacturer: String,
    regNo: { type: String, index: true },
    strength: String,
    verified: { type: Boolean, default: false },
    indications: String,
    dosageSimpleEn: String,
    dosageSimpleRw: String,
    warningEn: String,
    warningRw: String,
    expiryStatus: String
  },
  { timestamps: true, collection: 'medicines' }
);

module.exports = mongoose.model('Medicine', MedicineSchema);
