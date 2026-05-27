const fs = require('fs');
const path = require('path');
const authenticityService = require('./authenticityService');
const { isConnected } = require('../db');
const Medicine = require('../models/Medicine');

const COSMETIC_PERFUME_KEYWORDS = ['cream', 'lotion', 'bleach', 'moistur', 'perfume', 'eau de', 'sauvage', 'chanel', 'dior', 'nivea', 'fair'];

class VerifyService {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/medicines.json');
  }

  /**
   * Cross-reference scanned medicine against trusted database (MongoDB → JSON fallback)
   */
  async verifyMedicine(scannedData) {
    console.log('[VerifyService] Verifying product:', scannedData.medicineName);

    // Route cosmetics/perfumes to authenticityService
    const nameLower = (scannedData.medicineName || '').toLowerCase();
    const isNonMedicine = COSMETIC_PERFUME_KEYWORDS.some(kw => nameLower.includes(kw));
    if (isNonMedicine || scannedData.productCategory === 'cosmetic' || scannedData.productCategory === 'perfume') {
      console.log('[VerifyService] Routing to AuthenticityService for cosmetic/perfume check.');
      return authenticityService.verifyProduct(scannedData);
    }

    try {
      const scannedNameClean = (scannedData.medicineName || '').toLowerCase().trim();
      const scannedRegNo = (scannedData.regNo || '').toLowerCase().trim();

      let record = null;

      if (isConnected()) {
        // Try MongoDB first
        const regExp = scannedNameClean
          ? new RegExp(scannedNameClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          : null;

        const query = { $or: [] };
        if (scannedRegNo && scannedRegNo !== 'none' && scannedRegNo !== 'none (unregistered batch)') {
          query.$or.push({ regNo: new RegExp(scannedRegNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
        }
        if (regExp) query.$or.push({ name: regExp });

        if (query.$or.length > 0) {
          const doc = await Medicine.findOne(query).lean();
          if (doc) record = doc;
        }
      }

      if (!record) {
        // JSON fallback
        const medicines = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        record = medicines.find(m => {
          const dbName = (m.name || '').toLowerCase();
          const dbReg = (m.regNo || '').toLowerCase();
          if (!dbName) return false;
          return (scannedRegNo && scannedRegNo !== 'none' && dbReg && dbReg.includes(scannedRegNo)) ||
                 (scannedNameClean && scannedNameClean.includes(dbName)) ||
                 (scannedNameClean && dbName.includes(scannedNameClean));
        });
      }

      if (record) {
        console.log('[VerifyService] Registry MATCH found:', record.name);
        return {
          verified: true,
          registryRecord: record,
          matchType: 'Registry Database Match',
          reason: 'This medicine matches an active registration entry in the Rwanda FDA drug registry list.',
          alertLevel: 'safe'
        };
      }

      // Suspicious / counterfeit detection
      if (scannedData.regNo === 'NONE (Unregistered Batch)' || scannedNameClean.includes('fever-x')) {
        console.log('[VerifyService] Suspicious counterfeit medicine flagged!');
        return {
          verified: false,
          registryRecord: null,
          matchType: 'UNREGISTERED / SUSPICIOUS PRODUCT',
          reason: 'WARNING: This product registration code is invalid, missing, or falsified. No approved registry entries exist for this packaging.',
          alertLevel: 'danger'
        };
      }

      console.log('[VerifyService] No matching database record found. Flagging as unverified.');
      return {
        verified: false,
        registryRecord: null,
        matchType: 'UNVERIFIED',
        reason: 'This medicine packaging or batch has not been verified against the official Rwanda FDA registry list. Extreme caution is advised.',
        alertLevel: 'warning'
      };

    } catch (err) {
      console.error('[VerifyService] Error during verification:', err.message);
      return {
        verified: false,
        registryRecord: null,
        matchType: 'DATABASE_ERROR',
        reason: 'Unable to connect to registry database. Please try again.',
        alertLevel: 'warning'
      };
    }
  }
}

module.exports = new VerifyService();
