require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { connectDB } = require('../db');
const Medicine = require('../models/Medicine');
const Cosmetic = require('../models/Cosmetic');
const Perfume = require('../models/Perfume');

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('[Seed] MONGODB_URI is not set in .env — aborting.');
    process.exit(1);
  }

  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.error('[Seed] Database connection not ready — aborting.');
    process.exit(1);
  }

  const dataDir = path.join(__dirname, '../data');
  const medicines = JSON.parse(fs.readFileSync(path.join(dataDir, 'medicines.json'), 'utf8'));
  const cosmetics = JSON.parse(fs.readFileSync(path.join(dataDir, 'cosmetics.json'), 'utf8'));
  const perfumes = JSON.parse(fs.readFileSync(path.join(dataDir, 'perfumes.json'), 'utf8'));

  const upsert = async (Model, items, label) => {
    let inserted = 0, updated = 0;
    for (const item of items) {
      const result = await Model.updateOne(
        { id: item.id },
        { $set: item },
        { upsert: true }
      );
      if (result.upsertedCount) inserted++;
      else if (result.modifiedCount) updated++;
    }
    console.log(`[Seed] ${label}: ${inserted} inserted, ${updated} updated, total ${items.length}`);
  };

  await upsert(Medicine, medicines, 'medicines');
  await upsert(Cosmetic, cosmetics, 'cosmetics');
  await upsert(Perfume, perfumes, 'perfumes');

  console.log('[Seed] Done.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
