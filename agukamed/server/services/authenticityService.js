const fs = require('fs');
const path = require('path');
const { isConnected } = require('../db');
const Cosmetic = require('../models/Cosmetic');
const Perfume = require('../models/Perfume');

class AuthenticityService {
  constructor() {
    this.cosmeticsPath = path.join(__dirname, '../data/cosmetics.json');
    this.perfumesPath = path.join(__dirname, '../data/perfumes.json');
  }

  async verifyProduct(scannedData) {
    const name = (scannedData.medicineName || '').toLowerCase();
    const regNo = (scannedData.regNo || '').toLowerCase();

    const isCosmetic = name.includes('cream') || name.includes('lotion') || name.includes('bleach') || name.includes('moistur');
    const isPerfume = name.includes('perfume') || name.includes('eau de') || name.includes('sauvage') || name.includes('chanel') || name.includes('dior');

    // Hard counterfeit signal: explicit "(counterfeit)" / "(fake)" / missing reg
    const looksCounterfeit = name.includes('counterfeit') || name.includes('(fake)') || regNo === 'none' || regNo === '';
    if (looksCounterfeit) {
      return {
        verified: false,
        registryRecord: null,
        matchType: 'COUNTERFEIT / DANGEROUS PRODUCT',
        reason: 'This product packaging shows clear counterfeit signals: missing or falsified registration. Do not use.',
        alertLevel: 'danger'
      };
    }

    let record = null;

    if (isConnected()) {
      record = await this._findInMongo(name, regNo, { isCosmetic, isPerfume });
    }

    if (!record) {
      record = this._findInJson(name, regNo, { isCosmetic, isPerfume });
    }

    if (!record) {
      return {
        verified: false,
        registryRecord: null,
        matchType: 'UNREGISTERED PRODUCT',
        reason: 'This product has no matching entry in the Rwanda FDA cosmetics or perfumes registry.',
        alertLevel: 'warning'
      };
    }

    if (!record.verified || record.regNo === 'NONE') {
      return {
        verified: false,
        registryRecord: record,
        matchType: 'COUNTERFEIT / DANGEROUS PRODUCT',
        reason: record.warnings,
        alertLevel: 'danger'
      };
    }

    if (record.batchFormat && scannedData.batchCode) {
      const regex = new RegExp(record.batchFormat);
      if (!regex.test(scannedData.batchCode)) {
        return {
          verified: false,
          registryRecord: record,
          matchType: 'INVALID BATCH CODE',
          reason: 'Product name matches registry but batch code format is inconsistent with authentic packaging.',
          alertLevel: 'warning'
        };
      }
    }

    return {
      verified: true,
      registryRecord: record,
      matchType: 'Registry Match — Authentic Product',
      reason: `This ${record.type} matches an active Rwanda FDA registration entry.`,
      alertLevel: 'safe'
    };
  }

  async _findInMongo(name, regNo, { isCosmetic, isPerfume }) {
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = name ? new RegExp(escape(name), 'i') : null;
    const firstWord = name.split(' ')[0];
    const firstWordRe = firstWord ? new RegExp(`^${escape(firstWord)}`, 'i') : null;

    const buildQuery = () => {
      const ors = [];
      if (regNo && regNo !== 'none') ors.push({ regNo: new RegExp(`^${escape(regNo)}$`, 'i') });
      if (nameRe) ors.push({ brand: nameRe }, { name: nameRe });
      if (firstWordRe) ors.push({ name: firstWordRe });
      return ors.length ? { $or: ors } : null;
    };

    const query = buildQuery();
    if (!query) return null;

    try {
      if (isPerfume) return await Perfume.findOne(query).lean();
      if (isCosmetic) return await Cosmetic.findOne(query).lean();
      // Try both
      return (await Cosmetic.findOne(query).lean()) || (await Perfume.findOne(query).lean());
    } catch (err) {
      console.error('[AuthenticityService] Mongo lookup failed:', err.message);
      return null;
    }
  }

  _findInJson(name, regNo, { isCosmetic, isPerfume }) {
    let db = [];
    try {
      if (isPerfume) {
        db = JSON.parse(fs.readFileSync(this.perfumesPath, 'utf8'));
      } else if (isCosmetic) {
        db = JSON.parse(fs.readFileSync(this.cosmeticsPath, 'utf8'));
      } else {
        const cosmetics = JSON.parse(fs.readFileSync(this.cosmeticsPath, 'utf8'));
        const perfumes = JSON.parse(fs.readFileSync(this.perfumesPath, 'utf8'));
        db = [...cosmetics, ...perfumes];
      }
    } catch (err) {
      console.error('[AuthenticityService] JSON read failed:', err.message);
      return null;
    }

    return db.find(p => {
      const dbName = p.name.toLowerCase();
      const dbBrand = (p.brand || '').toLowerCase();
      const dbReg = (p.regNo || '').toLowerCase();
      return (regNo && regNo !== 'none' && dbReg === regNo) ||
             name.includes(dbBrand) || dbName.includes(name) || name.includes(dbName.split(' ')[0]);
    });
  }
}

module.exports = new AuthenticityService();
